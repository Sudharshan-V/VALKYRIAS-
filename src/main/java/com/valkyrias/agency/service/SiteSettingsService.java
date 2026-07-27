package com.valkyrias.agency.service;

import com.valkyrias.agency.exception.DomainValidationException;
import com.valkyrias.agency.model.SiteSettings;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.SiteSettingsRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.regex.Pattern;

@Service
public class SiteSettingsService {
    private static final String PUBLIC_ID = "public";
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final SiteSettingsRepository repository;
    private final CurrentUserService currentUserService;

    public SiteSettingsService(SiteSettingsRepository repository, CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public SiteSettings getPublic() {
        return repository.findById(PUBLIC_ID).orElseGet(SiteSettingsService::defaults);
    }

    @Transactional
    public SiteSettings update(SupabaseUserPrincipal principal, SiteSettings request) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        SiteSettings settings = repository.findById(PUBLIC_ID).orElseGet(SiteSettingsService::defaults);
        settings.setBrandDescription(required(request.getBrandDescription(), "Brand description", 5000));
        settings.setWebsiteUrl(optionalUrl(request.getWebsiteUrl()));
        settings.setInstagramUrl(optionalUrl(request.getInstagramUrl()));
        settings.setYoutubeUrl(optionalUrl(request.getYoutubeUrl()));
        settings.setVimeoUrl(optionalUrl(request.getVimeoUrl()));
        settings.setSupportEmail(email(request.getSupportEmail(), "Support email"));
        settings.setPrivacyEmail(email(request.getPrivacyEmail(), "Privacy email"));
        settings.setContactPhone(required(request.getContactPhone(), "Contact phone", 80));
        settings.setAddress(required(request.getAddress(), "Address", 5000));
        settings.setPrivacyPolicy(required(request.getPrivacyPolicy(), "Privacy policy", 100_000));
        settings.setTermsConditions(required(request.getTermsConditions(), "Terms and Conditions", 100_000));
        settings.setEffectiveDate(required(request.getEffectiveDate(), "Effective date", 80));
        settings.setUpdatedAt(OffsetDateTime.now());
        return repository.save(settings);
    }

    private static SiteSettings defaults() {
        SiteSettings value = new SiteSettings();
        value.setId(PUBLIC_ID);
        value.setBrandDescription("Redefining cinematic boundaries through tech-driven artistry and luxury visual storytelling since 2018.");
        value.setWebsiteUrl("https://valkyrias.co");
        value.setInstagramUrl("https://instagram.com/");
        value.setYoutubeUrl("https://youtube.com/");
        value.setVimeoUrl("https://vimeo.com/");
        value.setSupportEmail("valkyriasproclub@gmail.com");
        value.setPrivacyEmail("cooperdesignss@gmail.com");
        value.setContactPhone("+91 00000 00000");
        value.setAddress("Vanasangari Amman Kovil Street, Ramanathapuram, Tamil Nadu – 623501, India");
        value.setPrivacyPolicy("");
        value.setTermsConditions("");
        value.setEffectiveDate("27 July 2026");
        value.setUpdatedAt(OffsetDateTime.now());
        return value;
    }

    private static String email(String value, String label) {
        String cleaned = required(value, label, 320);
        if (!EMAIL.matcher(cleaned).matches()) throw new DomainValidationException(label + " is invalid");
        return cleaned;
    }

    private static String required(String value, String label, int maxLength) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.isEmpty()) throw new DomainValidationException(label + " is required");
        if (cleaned.length() > maxLength) throw new DomainValidationException(label + " is too long");
        return cleaned;
    }


    private static String optionalUrl(String value) {
        String cleaned = optional(value, 1000);
        if (cleaned.isEmpty()) return cleaned;
        String normalized = cleaned.matches("(?i)^https?://.*") ? cleaned : "https://" + cleaned;
        try {
            URI uri = URI.create(normalized);
            if (("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && !uri.getHost().isBlank()) {
                return normalized;
            }
        } catch (IllegalArgumentException ignored) {
            // Converted to the domain validation error below.
        }
        throw new DomainValidationException("Website and social links must be valid HTTP or HTTPS URLs");
    }

    private static String optional(String value, int maxLength) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.length() > maxLength) throw new DomainValidationException("A website or social URL is too long");
        return cleaned;
    }
}
