package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.RevisionRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RevisionRequestRepository extends JpaRepository<RevisionRequest, UUID> {
    List<RevisionRequest> findByOrderIdOrderByCreatedAtDesc(UUID orderId);
}
