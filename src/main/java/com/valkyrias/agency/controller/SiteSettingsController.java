package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.SiteSettings;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.SiteSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/site-settings")
public class SiteSettingsController {
    private final SiteSettingsService service;

    public SiteSettingsController(SiteSettingsService service) {
        this.service = service;
    }

    @GetMapping("/public")
    public ResponseEntity<SiteSettings> getPublic() {
        return ResponseEntity.ok(service.getPublic());
    }

    @PutMapping
    public ResponseEntity<SiteSettings> update(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody SiteSettings request
    ) {
        return ResponseEntity.ok(service.update(principal, request));
    }
}
