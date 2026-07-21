package com.valkyrias.agency.service;

import com.valkyrias.agency.model.AppSetting;
import com.valkyrias.agency.repository.AppSettingRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class AppSettingService {

    private final AppSettingRepository appSettingRepository;

    public AppSettingService(AppSettingRepository appSettingRepository) {
        this.appSettingRepository = appSettingRepository;
    }

    public Optional<AppSetting> getSettingsByUserId(UUID userId) {
        return appSettingRepository.findById(userId);
    }

    public AppSetting saveSettings(AppSetting settings) {
        return appSettingRepository.save(settings);
    }
}
