package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.EditorProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EditorProfileRepository extends JpaRepository<EditorProfile, UUID> {
}
