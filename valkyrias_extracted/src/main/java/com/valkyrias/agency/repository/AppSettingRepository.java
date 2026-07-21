package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AppSettingRepository extends JpaRepository<AppSetting, UUID> {
}
