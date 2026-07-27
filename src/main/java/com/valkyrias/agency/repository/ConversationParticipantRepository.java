package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.ConversationParticipant;
import com.valkyrias.agency.model.ConversationParticipantId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, ConversationParticipantId> {
    boolean existsByConversationIdAndUserIdAndLeftAtIsNull(UUID conversationId, UUID userId);
    List<ConversationParticipant> findByConversationIdAndLeftAtIsNull(UUID conversationId);
}
