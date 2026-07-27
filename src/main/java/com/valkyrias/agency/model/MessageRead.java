package com.valkyrias.agency.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "message_reads")
@Getter
@Setter
@NoArgsConstructor
public class MessageRead {
    @EmbeddedId
    private MessageReadId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("messageId")
    @JoinColumn(name = "message_id", nullable = false)
    private ConversationMessage message;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "read_at", nullable = false)
    private OffsetDateTime readAt;

    public MessageRead(ConversationMessage message, User user) {
        this.message = message;
        this.user = user;
        this.id = new MessageReadId(message.getId(), user.getId());
        this.readAt = OffsetDateTime.now();
    }

    @PrePersist
    void createTimestamp() { readAt = readAt == null ? OffsetDateTime.now() : readAt; }
}
