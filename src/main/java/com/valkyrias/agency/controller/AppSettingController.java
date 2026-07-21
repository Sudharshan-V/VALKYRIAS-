package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.AppSetting;
import com.valkyrias.agency.service.AppSettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*")
public class AppSettingController {

    private final AppSettingService appSettingService;

    public AppSettingController(AppSettingService appSettingService) {
        this.appSettingService = appSettingService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<AppSetting> getSettings(@PathVariable UUID userId) {
        return appSettingService.getSettingsByUserId(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<AppSetting> saveSettings(@RequestBody AppSetting settings) {
        return ResponseEntity.ok(appSettingService.saveSettings(settings));
    }
}
