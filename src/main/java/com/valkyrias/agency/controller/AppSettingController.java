package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.AppSetting;
import com.valkyrias.agency.repository.AppSettingRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.CurrentUserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/settings")
public class AppSettingController {

    private final AppSettingRepository appSettingRepository;
    private final CurrentUserService currentUserService;

    public AppSettingController(AppSettingRepository appSettingRepository, CurrentUserService currentUserService) {
        this.appSettingRepository = appSettingRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<AppSetting> getSettings(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return appSettingRepository.findById(currentUserService.require(principal).getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<AppSetting> saveSettings(@AuthenticationPrincipal SupabaseUserPrincipal principal, @RequestBody AppSetting settings) {
        settings.setId(currentUserService.require(principal).getId());
        return ResponseEntity.ok(appSettingRepository.save(settings));
    }
}
