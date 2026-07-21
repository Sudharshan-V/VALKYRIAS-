package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface PlanRepository extends JpaRepository<Plan, String> {
    List<Plan> findByUserId(UUID userId);
}
