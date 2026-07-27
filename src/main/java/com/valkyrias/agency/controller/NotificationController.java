package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.NotificationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) { this.service = service; }

    @GetMapping
    public DomainDtos.PageResponse<DomainDtos.NotificationResponse> list(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) { return service.list(principal, page, size); }

    @PostMapping("/{notificationId}/read")
    public DomainDtos.NotificationResponse read(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID notificationId
    ) { return service.markRead(principal, notificationId); }
}
