package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.exception.DomainValidationException;
import com.valkyrias.agency.exception.ResourceNotFoundException;
import com.valkyrias.agency.model.Coupon;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.CouponRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class CouponService {
    private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private final CouponRepository repository;
    private final CurrentUserService currentUserService;
    private final SecureRandom random = new SecureRandom();

    public CouponService(CouponRepository repository, CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<DomainDtos.CouponResponse> list(SupabaseUserPrincipal principal) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        return repository.findAllByOrderByCreatedAtDesc().stream().map(this::response).toList();
    }

    @Transactional
    public DomainDtos.CouponResponse create(
            SupabaseUserPrincipal principal,
            DomainDtos.CouponRequest request
    ) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        String code = normalize(request.code());
        if (code.isBlank()) code = generateUniqueCode();
        if (repository.existsByCodeIgnoreCase(code)) {
            throw new DomainValidationException("A coupon with this code already exists.");
        }
        if (request.expiresAt() != null && !request.expiresAt().isAfter(OffsetDateTime.now())) {
            throw new DomainValidationException("Coupon expiry must be in the future.");
        }
        Coupon coupon = new Coupon();
        coupon.setCode(code);
        coupon.setDiscountPercent(request.discountPercent());
        coupon.setActive(request.active());
        coupon.setExpiresAt(request.expiresAt());
        return response(repository.save(coupon));
    }

    @Transactional
    public DomainDtos.CouponResponse setActive(
            SupabaseUserPrincipal principal,
            UUID couponId,
            boolean active
    ) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        Coupon coupon = repository.findById(couponId)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found"));
        coupon.setActive(active);
        return response(repository.save(coupon));
    }

    @Transactional(readOnly = true)
    public Coupon requireRedeemable(String rawCode) {
        String code = normalize(rawCode);
        Coupon coupon = repository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new DomainValidationException("Coupon code is invalid."));
        if (!coupon.isActive()) {
            throw new DomainValidationException("This coupon is no longer active.");
        }
        if (coupon.getExpiresAt() != null && !coupon.getExpiresAt().isAfter(OffsetDateTime.now())) {
            throw new DomainValidationException("This coupon has expired.");
        }
        return coupon;
    }

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder suffix = new StringBuilder(8);
            for (int index = 0; index < 8; index++) {
                suffix.append(CODE_CHARS[random.nextInt(CODE_CHARS.length)]);
            }
            code = "VK-" + suffix;
        } while (repository.existsByCodeIgnoreCase(code));
        return code;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private DomainDtos.CouponResponse response(Coupon coupon) {
        return new DomainDtos.CouponResponse(
                coupon.getId(), coupon.getCode(), coupon.getDiscountPercent(), coupon.isActive(),
                coupon.getExpiresAt(), coupon.getCreatedAt(), coupon.getUpdatedAt());
    }
}
