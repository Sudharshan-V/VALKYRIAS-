package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.ClientProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ClientProfileRepository extends JpaRepository<ClientProfile, UUID> {
}
