package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.OrderRequirement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrderRequirementRepository extends JpaRepository<OrderRequirement, UUID> {
    List<OrderRequirement> findByOrderIdOrderByRequirementKeyAsc(UUID orderId);
}
