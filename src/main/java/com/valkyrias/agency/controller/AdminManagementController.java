package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.AdminManagementService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminManagementController {
    private final AdminManagementService service;
    private final com.valkyrias.agency.service.CouponService couponService;

    public AdminManagementController(
            AdminManagementService service,
            com.valkyrias.agency.service.CouponService couponService
    ) {
        this.service = service;
        this.couponService = couponService;
    }

    @GetMapping("/editors/available")
    public List<DomainDtos.AvailableEditorResponse> availableEditors(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return service.availableEditors(principal);
    }

    @GetMapping("/users")
    public List<DomainDtos.AdminUserResponse> users(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return service.listUsers(principal);
    }

    @PatchMapping("/users/{userId}")
    public DomainDtos.AdminUserResponse updateUser(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID userId,
            @Valid @RequestBody DomainDtos.AdminUserUpdateRequest request
    ) { return service.updateUser(principal, userId, request); }

    @DeleteMapping("/users/{userId}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void deleteUser(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID userId
    ) {
        service.deleteUser(principal, userId);
    }

    @PostMapping("/notifications")
    public DomainDtos.NotificationResponse createNotification(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @Valid @RequestBody DomainDtos.AdminNotificationRequest request
    ) { return service.createNotification(principal, request); }

    @GetMapping("/coupons")
    public List<DomainDtos.CouponResponse> coupons(
            @AuthenticationPrincipal SupabaseUserPrincipal principal
    ) { return couponService.list(principal); }

    @PostMapping("/coupons")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public DomainDtos.CouponResponse createCoupon(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @Valid @RequestBody DomainDtos.CouponRequest request
    ) { return couponService.create(principal, request); }

    @PatchMapping("/coupons/{couponId}/active")
    public DomainDtos.CouponResponse setCouponActive(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID couponId,
            @RequestParam boolean active
    ) { return couponService.setActive(principal, couponId, active); }
}
