package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.ServicePackage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ServicePackageRepository extends JpaRepository<ServicePackage, UUID> {
}
