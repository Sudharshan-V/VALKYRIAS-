package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.DashboardService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DashboardController {
    private final DashboardService service;

    public DashboardController(DashboardService service) { this.service = service; }

    @GetMapping("/client/dashboard")
    public DomainDtos.PortalDashboardResponse client(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return service.client(principal);
    }

    @GetMapping("/editor/dashboard")
    public DomainDtos.PortalDashboardResponse editor(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return service.editor(principal);
    }

    @GetMapping("/admin/dashboard")
    public DomainDtos.AdminDashboardResponse admin(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return service.admin(principal);
    }
}
