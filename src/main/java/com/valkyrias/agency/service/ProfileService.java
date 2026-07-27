package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.profile.ClientProfileRequest;
import com.valkyrias.agency.dto.profile.ClientProfileResponse;
import com.valkyrias.agency.dto.profile.EditorProfileRequest;
import com.valkyrias.agency.dto.profile.EditorProfileResponse;
import com.valkyrias.agency.dto.profile.ProfileResponse;
import com.valkyrias.agency.dto.profile.ProfileUpdateRequest;
import com.valkyrias.agency.exception.ProfileConflictException;
import com.valkyrias.agency.exception.ProfileStorageException;
import com.valkyrias.agency.exception.ProfileValidationException;
import com.valkyrias.agency.model.ClientProfile;
import com.valkyrias.agency.model.AccountStatus;
import com.valkyrias.agency.model.EditorProfile;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.ClientProfileRepository;
import com.valkyrias.agency.repository.EditorProfileRepository;
import com.valkyrias.agency.repository.UserRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.storage.AvatarStorageService;
import com.valkyrias.agency.storage.AvatarValidator;
import com.valkyrias.agency.storage.ValidatedAvatar;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
public class ProfileService {

    private static final Logger log = LoggerFactory.getLogger(ProfileService.class);

    private final UserRepository userRepository;
    private final ClientProfileRepository clientProfileRepository;
    private final EditorProfileRepository editorProfileRepository;
    private final AvatarStorageService avatarStorageService;
    private final AvatarValidator avatarValidator;

    public ProfileService(
            UserRepository userRepository,
            ClientProfileRepository clientProfileRepository,
            EditorProfileRepository editorProfileRepository,
            AvatarStorageService avatarStorageService,
            AvatarValidator avatarValidator
    ) {
        this.userRepository = userRepository;
        this.clientProfileRepository = clientProfileRepository;
        this.editorProfileRepository = editorProfileRepository;
        this.avatarStorageService = avatarStorageService;
        this.avatarValidator = avatarValidator;
    }

    @Transactional
    public ProfileResponse getMyProfile(SupabaseUserPrincipal principal, UserRole selectedRole) {
        User user = synchronizeUser(requirePrincipal(principal));
        UserRole actualRole = requireSupportedRole(user);
        if (selectedRole != null && actualRole != selectedRole) {
            log.warn("Rejected role-mismatched login for Supabase user {}: requested {}, stored {}",
                    principal.userId(), selectedRole, actualRole);
            throw new AccessDeniedException("You are not registered as " + roleWithArticle(selectedRole) + ".");
        }
        log.info("Authenticated Supabase user {} with role {}", principal.userId(), actualRole);
        return toResponse(user, principal);
    }

    @Transactional
    public ProfileResponse updateMyProfile(SupabaseUserPrincipal principal, ProfileUpdateRequest request) {
        requirePrincipal(principal);
        User user = synchronizeUser(principal);
        UserRole role = requireSupportedRole(user);
        validateRolePayload(role, request);

        user.setFullName(request.fullName().trim());
        user.setDisplayName(normalize(request.displayName()));
        user.setPhoneNumber(normalize(request.phoneNumber()));
        user.setCountry(normalize(request.country()));
        user.setTimezone(normalize(request.timezone()));
        user.setBio(normalize(request.bio()));
        user.setUpdatedAt(OffsetDateTime.now());
        userRepository.saveAndFlush(user);

        if (role == UserRole.CLIENT && request.clientProfile() != null) {
            updateClientProfile(user, request.clientProfile());
        } else if (role == UserRole.EDITOR && request.editorProfile() != null) {
            updateEditorProfile(user, request.editorProfile());
        }

        return toResponse(user, principal);
    }

    @Transactional
    public ProfileResponse uploadMyAvatar(SupabaseUserPrincipal principal, MultipartFile file) {
        requirePrincipal(principal);
        User user = synchronizeUser(principal);
        ValidatedAvatar avatar = avatarValidator.validate(file);
        String previousPath = user.getProfileImagePath();
        String newPath = avatarStorageService.upload(principal.userId(), avatar);
        registerReplacementCleanup(newPath, previousPath);
        user.setProfileImagePath(newPath);
        userRepository.saveAndFlush(user);
        return toResponse(user, principal);
    }

    @Transactional
    public void deleteMyAvatar(SupabaseUserPrincipal principal) {
        requirePrincipal(principal);
        User user = synchronizeUser(principal);
        String path = user.getProfileImagePath();
        if (!StringUtils.hasText(path)) {
            return;
        }

        user.setProfileImagePath(null);
        userRepository.saveAndFlush(user);
        registerDeleteAfterCommit(path);
    }

    private User synchronizeUser(SupabaseUserPrincipal principal) {
        String verifiedEmail = principal.email().trim().toLowerCase(Locale.ROOT);
        Optional<User> existing = userRepository.findBySupabaseUserId(principal.userId())
                .or(() -> userRepository.findByEmailIgnoreCase(verifiedEmail));

        User user;
        boolean changed = false;
        if (existing.isPresent()) {
            user = existing.get();
            if (user.getSupabaseUserId() != null && !user.getSupabaseUserId().equals(principal.userId())) {
                throw new ProfileConflictException("This email is already linked to another Supabase account");
            }
            if (user.getSupabaseUserId() == null) {
                user.setSupabaseUserId(principal.userId());
                changed = true;
            }
            if (!user.getEmail().equalsIgnoreCase(verifiedEmail)) {
                Optional<User> emailOwner = userRepository.findByEmailIgnoreCase(verifiedEmail);
                if (emailOwner.isPresent() && !emailOwner.get().getId().equals(user.getId())) {
                    throw new ProfileConflictException("The verified email is already linked to another account");
                }
                user.setEmail(verifiedEmail);
                changed = true;
            } else if (!user.getEmail().equals(verifiedEmail)) {
                user.setEmail(verifiedEmail);
                changed = true;
            }
            if (!StringUtils.hasText(user.getName())) {
                user.setName(defaultFullName(principal));
                changed = true;
            }
            if (user.getUpdatedAt() == null) {
                user.setUpdatedAt(user.getCreatedAt() == null ? OffsetDateTime.now() : user.getCreatedAt());
                changed = true;
            }
        } else {
            user = new User();
            user.setSupabaseUserId(principal.userId());
            user.setEmail(verifiedEmail);
            user.setName(defaultFullName(principal));
            user.setRole(UserRole.CLIENT);
            user.setAccountStatus(AccountStatus.ACTIVE);
            changed = true;
        }

        if (user.getAccountStatus() == null) {
            user.setAccountStatus(AccountStatus.ACTIVE);
            changed = true;
        }
        user.setLastLoginAt(OffsetDateTime.now());
        changed = true;

        try {
            return changed ? userRepository.saveAndFlush(user) : user;
        } catch (DataIntegrityViolationException exception) {
            throw new ProfileConflictException("The verified account could not be linked to a local profile");
        }
    }

    private void updateClientProfile(User user, ClientProfileRequest request) {
        ClientProfile profile = clientProfileRepository.findById(user.getId())
                .orElseGet(() -> new ClientProfile(user));
        profile.setCompanyName(normalize(request.companyName()));
        profile.setClientType(request.clientType());
        profile.setPreferredCommunication(request.preferredCommunication());
        profile.setDefaultProjectCategory(normalize(request.defaultProjectCategory()));
        clientProfileRepository.saveAndFlush(profile);
    }

    private void updateEditorProfile(User user, EditorProfileRequest request) {
        EditorProfile profile = editorProfileRepository.findById(user.getId())
                .orElseGet(() -> new EditorProfile(user));
        profile.setProfessionalTitle(normalize(request.professionalTitle()));
        profile.setExperienceYears(request.experienceYears());
        profile.setSkills(normalizeSet(request.skills()));
        profile.setSoftwareUsed(normalizeSet(request.softwareUsed()));
        profile.setLanguages(normalizeSet(request.languages()));
        profile.setStartingPrice(request.startingPrice());
        profile.setHourlyRate(request.hourlyRate());
        profile.setDeliveryTime(normalize(request.deliveryTime()));
        profile.setAvailabilityStatus(request.availabilityStatus());
        profile.setPortfolioSummary(normalize(request.portfolioSummary()));
        profile.setCertifications(normalizeSet(request.certifications()));
        profile.setLocation(normalize(request.location()));
        profile.setWebsiteUrl(normalize(request.websiteUrl()));
        profile.setInstagramUrl(normalize(request.instagramUrl()));
        profile.setLinkedinUrl(normalize(request.linkedinUrl()));
        editorProfileRepository.saveAndFlush(profile);
    }

    private ProfileResponse toResponse(User user, SupabaseUserPrincipal principal) {
        UserRole role = requireSupportedRole(user);
        ClientProfileResponse clientResponse = null;
        EditorProfileResponse editorResponse = null;

        if (role == UserRole.CLIENT) {
            clientResponse = clientProfileRepository.findById(user.getId())
                    .map(ProfileService::toClientResponse)
                    .orElse(null);
        } else if (role == UserRole.EDITOR) {
            editorResponse = editorProfileRepository.findById(user.getId())
                    .map(ProfileService::toEditorResponse)
                    .orElse(null);
        }

        String avatarUrl = null;
        if (StringUtils.hasText(user.getProfileImagePath())) {
            try {
                avatarUrl = avatarStorageService.createSignedUrl(user.getProfileImagePath());
            } catch (ProfileStorageException exception) {
                log.warn("Profile {} loaded without an avatar because the signed URL could not be generated: {}",
                        user.getId(), exception.getMessage());
            }
        }
        return new ProfileResponse(
                user.getId(),
                principal.userId(),
                principal.email(),
                role,
                user.getAccountStatus(),
                isProfileComplete(user, role, clientResponse, editorResponse),
                user.getFullName(),
                user.getDisplayName(),
                avatarUrl,
                user.getPhoneNumber(),
                user.getCountry(),
                user.getTimezone(),
                user.getBio(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                clientResponse,
                editorResponse
        );
    }

    private static boolean isProfileComplete(
            User user,
            UserRole role,
            ClientProfileResponse clientProfile,
            EditorProfileResponse editorProfile
    ) {
        if (!StringUtils.hasText(user.getFullName())) {
            return false;
        }
        return switch (role) {
            case CLIENT -> clientProfile != null;
            case EDITOR -> editorProfile != null
                    && StringUtils.hasText(editorProfile.professionalTitle())
                    && !editorProfile.skills().isEmpty();
            case ADMIN -> true;
        };
    }

    private static ClientProfileResponse toClientResponse(ClientProfile profile) {
        return new ClientProfileResponse(
                profile.getCompanyName(),
                profile.getClientType(),
                profile.getPreferredCommunication(),
                profile.getDefaultProjectCategory()
        );
    }

    private static EditorProfileResponse toEditorResponse(EditorProfile profile) {
        return new EditorProfileResponse(
                profile.getProfessionalTitle(),
                profile.getExperienceYears(),
                sorted(profile.getSkills()),
                sorted(profile.getSoftwareUsed()),
                sorted(profile.getLanguages()),
                profile.getStartingPrice(),
                profile.getHourlyRate(),
                profile.getDeliveryTime(),
                profile.getAvailabilityStatus(),
                profile.getPortfolioSummary(),
                sorted(profile.getCertifications()),
                profile.getLocation(),
                profile.getWebsiteUrl(),
                profile.getInstagramUrl(),
                profile.getLinkedinUrl()
        );
    }

    private static List<String> sorted(Set<String> values) {
        return values.stream().sorted(Comparator.comparing(String::toLowerCase)).toList();
    }

    private static Set<String> normalizeSet(Set<String> values) {
        if (values == null) {
            return Set.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        Set<String> seen = new HashSet<>();
        for (String value : values) {
            String cleaned = normalize(value);
            if (StringUtils.hasText(cleaned) && seen.add(cleaned.toLowerCase(Locale.ROOT))) {
                normalized.add(cleaned);
            }
        }
        return normalized;
    }

    private static String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static String defaultFullName(SupabaseUserPrincipal principal) {
        String candidate;
        if (StringUtils.hasText(principal.fullName())) {
            candidate = principal.fullName().trim();
        } else {
            String email = principal.email();
            int at = email.indexOf('@');
            candidate = at > 0 ? email.substring(0, at) : email;
        }
        if (candidate.length() > 100) {
            candidate = candidate.substring(0, 100).trim();
        }
        return candidate.length() >= 2 ? candidate : "User";
    }

    private static UserRole requireSupportedRole(User user) {
        try {
            if (user.getRole() == null) {
                throw new IllegalArgumentException("A user role is required");
            }
            return user.getRole();
        } catch (IllegalArgumentException exception) {
            throw new AccessDeniedException("Account role is not supported");
        }
    }

    private static String roleWithArticle(UserRole role) {
        String display = role.name().charAt(0) + role.name().substring(1).toLowerCase(Locale.ROOT);
        return (role == UserRole.CLIENT ? "a " : "an ") + display;
    }

    private static void validateRolePayload(UserRole role, ProfileUpdateRequest request) {
        if (role == UserRole.CLIENT && request.editorProfile() != null) {
            throw new ProfileValidationException("CLIENT accounts cannot submit editor profile fields");
        }
        if (role == UserRole.EDITOR && request.clientProfile() != null) {
            throw new ProfileValidationException("EDITOR accounts cannot submit client profile fields");
        }
        if (role == UserRole.ADMIN && (request.clientProfile() != null || request.editorProfile() != null)) {
            throw new ProfileValidationException("ADMIN accounts can update shared profile fields only");
        }
    }

    private static SupabaseUserPrincipal requirePrincipal(SupabaseUserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("An authenticated Supabase user is required");
        }
        return principal;
    }

    private void registerReplacementCleanup(String newPath, String previousPath) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Avatar replacement requires an active transaction");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                if (StringUtils.hasText(previousPath) && !previousPath.equals(newPath)) {
                    deleteAfterCommit(previousPath, "replaced");
                }
            }

            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    deleteAfterCommit(newPath, "rolled-back new");
                }
            }
        });
    }

    private void registerDeleteAfterCommit(String path) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Avatar deletion requires an active transaction");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteAfterCommit(path, "removed");
            }
        });
    }

    private void deleteAfterCommit(String path, String description) {
        try {
            avatarStorageService.delete(path);
        } catch (RuntimeException cleanupFailure) {
            log.warn("Could not delete {} avatar object", description);
        }
    }
}
