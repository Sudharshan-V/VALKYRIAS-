package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.MessageRead;
import com.valkyrias.agency.model.MessageReadId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface MessageReadRepository extends JpaRepository<MessageRead, MessageReadId> {
    @Query("select count(m) from ConversationMessage m where m.conversation.id=:conversationId and m.sender.id<>:userId and m.deletedAt is null and not exists (select r from MessageRead r where r.message=m and r.user.id=:userId)")
    long countUnread(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    @Modifying
    @Query(value = "insert into message_reads(message_id,user_id,read_at) select m.id,:userId,now() from public.conversation_messages m where m.conversation_id=:conversationId and m.sender_id<>:userId and m.deleted_at is null on conflict do nothing", nativeQuery = true)
    int markConversationRead(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);
}
