package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.exception.DomainValidationException;
import com.valkyrias.agency.exception.ResourceNotFoundException;
import com.valkyrias.agency.model.AccountStatus;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.UserRepository;
import com.valkyrias.agency.repository.EditorProfileRepository;
import com.valkyrias.agency.repository.OrderAssignmentRepository;
import com.valkyrias.agency.repository.ProjectOrderRepository;
import com.valkyrias.agency.security.SupabaseAdminAuthClient;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AdminManagementService {
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final EditorProfileRepository editorProfileRepository;
    private final ProjectOrderRepository orderRepository;
    private final OrderAssignmentRepository assignmentRepository;
    private final SupabaseAdminAuthClient supabaseAdminAuthClient;
    private final NotificationService notificationService;
    private final DomainMapper mapper;

    public AdminManagementService(UserRepository userRepository, CurrentUserService currentUserService,
                                  EditorProfileRepository editorProfileRepository, ProjectOrderRepository orderRepository,
                                  OrderAssignmentRepository assignmentRepository,
                                  SupabaseAdminAuthClient supabaseAdminAuthClient,
                                  NotificationService notificationService, DomainMapper mapper) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.editorProfileRepository = editorProfileRepository;
        this.orderRepository = orderRepository;
        this.assignmentRepository = assignmentRepository;
        this.supabaseAdminAuthClient = supabaseAdminAuthClient;
        this.notificationService = notificationService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<DomainDtos.AdminUserResponse> listUsers(SupabaseUserPrincipal principal) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(DashboardService::adminUser)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DomainDtos.AvailableEditorResponse> availableEditors(SupabaseUserPrincipal principal) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        return userRepository.findByRoleAndAccountStatusOrderByNameAsc(UserRole.EDITOR, AccountStatus.ACTIVE)
                .stream().map(user -> {
                    var profile = editorProfileRepository.findById(user.getId()).orElse(null);
                    return new DomainDtos.AvailableEditorResponse(
                            user.getId(), user.getName(), user.getEmail(), user.getAccountStatus(),
                            profile == null || profile.getAvailabilityStatus() == null
                                    ? "UNSPECIFIED" : profile.getAvailabilityStatus().name(),
                            profile == null ? List.of() : profile.getSkills().stream().sorted().toList(),
                            orderRepository.countByAssignedEditorIdAndStatusIn(user.getId(), OrderService.activeStatuses())
                    );
                }).toList();
    }

    @Transactional
    public DomainDtos.AdminUserResponse updateUser(
            SupabaseUserPrincipal principal,
            UUID userId,
            DomainDtos.AdminUserUpdateRequest request
    ) {
        User admin = currentUserService.requireRole(principal, UserRole.ADMIN);
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (target.getId().equals(admin.getId()) && (request.role() != null && request.role() != UserRole.ADMIN
                || request.accountStatus() != null && request.accountStatus() != AccountStatus.ACTIVE)) {
            throw new DomainValidationException("An administrator cannot remove their own active admin access");
        }
        if (request.role() != null) target.setRole(request.role());
        if (request.accountStatus() != null) target.setAccountStatus(request.accountStatus());
        return DashboardService.adminUser(userRepository.save(target));
    }

    @Transactional
    public void deleteUser(SupabaseUserPrincipal principal, UUID userId) {
        User admin = currentUserService.requireRole(principal, UserRole.ADMIN);
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (target.getId().equals(admin.getId())) {
            throw new DomainValidationException("An administrator cannot permanently delete their own account");
        }
        if (target.getRole() == UserRole.ADMIN
                && target.getAccountStatus() == AccountStatus.ACTIVE
                && userRepository.countByRoleAndAccountStatus(UserRole.ADMIN, AccountStatus.ACTIVE) <= 1) {
            throw new DomainValidationException("The last active administrator cannot be deleted");
        }

        long clientOrders = orderRepository.countByClientId(target.getId());
        long editorOrders = orderRepository.countByAssignedEditorId(target.getId());
        long assignmentHistory = assignmentRepository.countByEditorId(target.getId());
        if (clientOrders > 0 || editorOrders > 0 || assignmentHistory > 0) {
            throw new DomainValidationException(
                    "This user has protected order or assignment history. Suspend the account instead of deleting it."
            );
        }

        UUID supabaseUserId = target.getSupabaseUserId();
        if (supabaseUserId != null) {
            supabaseAdminAuthClient.deleteUser(supabaseUserId);
        }

        userRepository.delete(target);
        userRepository.flush();
    }

    @Transactional
    public DomainDtos.NotificationResponse createNotification(
            SupabaseUserPrincipal principal,
            DomainDtos.AdminNotificationRequest request
    ) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        User target = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return mapper.notification(notificationService.create(
                target,
                request.type().trim().toUpperCase(),
                request.title().trim(),
                request.body().trim(),
                null,
                null
        ));
    }
}
