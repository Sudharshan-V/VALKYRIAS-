package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByUserId(UUID userId);
}
