package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.Conversation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    @EntityGraph(attributePaths = {"order", "order.client", "order.assignedEditor"})
    Optional<Conversation> findByOrderId(UUID orderId);
}
