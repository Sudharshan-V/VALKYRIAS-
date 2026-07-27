package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.ConversationMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, UUID> {
    @EntityGraph(attributePaths = "sender")
    Page<ConversationMessage> findByConversationIdAndDeletedAtIsNull(UUID conversationId, Pageable pageable);

    Optional<ConversationMessage> findBySenderIdAndClientRequestId(UUID senderId, UUID clientRequestId);

    List<ConversationMessage> findByConversationIdAndSenderIdNotAndDeletedAtIsNull(UUID conversationId, UUID senderId);

    long countByConversationIdAndSenderIdNotAndDeletedAtIsNull(
            UUID conversationId,
            UUID senderId
    );
}
