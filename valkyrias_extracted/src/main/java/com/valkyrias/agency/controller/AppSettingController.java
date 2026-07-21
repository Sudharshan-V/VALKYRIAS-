package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.AppSetting;
import com.valkyrias.agency.repository.AppSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*")
public class AppSettingController {

    @Autowired
    private AppSettingRepository appSettingRepository;

    @GetMapping("/{userId}")
    public ResponseEntity<AppSetting> getSettings(@PathVariable UUID userId) {
        return appSettingRepository.findById(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<AppSetting> saveSettings(@RequestBody AppSetting settings) {
        return ResponseEntity.ok(appSettingRepository.save(settings));
    }
}
