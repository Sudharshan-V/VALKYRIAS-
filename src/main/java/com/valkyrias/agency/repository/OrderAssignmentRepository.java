package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.AssignmentStatus;
import com.valkyrias.agency.model.OrderAssignment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderAssignmentRepository extends JpaRepository<OrderAssignment, UUID> {
    @EntityGraph(attributePaths = {"order", "editor", "assignedBy"})
    Optional<OrderAssignment> findFirstByOrderIdAndStatusInOrderByAssignedAtDesc(
            UUID orderId,
            Collection<AssignmentStatus> statuses
    );

    @EntityGraph(attributePaths = {"order", "order.client", "editor", "assignedBy"})
    List<OrderAssignment> findByEditorIdAndStatusOrderByAssignedAtDesc(UUID editorId, AssignmentStatus status);

    long countByEditorId(UUID editorId);
}
