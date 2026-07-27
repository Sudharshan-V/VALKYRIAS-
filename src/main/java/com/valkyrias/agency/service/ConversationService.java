package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.exception.ResourceNotFoundException;
import com.valkyrias.agency.model.*;
import com.valkyrias.agency.repository.*;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class ConversationService {
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final ConversationMessageRepository messageRepository;
    private final MessageReadRepository readRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final DomainMapper mapper;

    public ConversationService(
            ConversationRepository conversationRepository,
            ConversationParticipantRepository participantRepository,
            ConversationMessageRepository messageRepository,
            MessageReadRepository readRepository,
            CurrentUserService currentUserService,
            NotificationService notificationService,
            DomainMapper mapper
    ) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.readRepository = readRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public DomainDtos.ConversationResponse forOrder(SupabaseUserPrincipal principal, UUID orderId) {
        User user = currentUserService.require(principal);
        Conversation conversation = conversationRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("This order does not have an active conversation"));
        requireParticipant(conversation.getId(), user);
        return new DomainDtos.ConversationResponse(conversation.getId(), orderId, conversation.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public DomainDtos.PageResponse<DomainDtos.MessageResponse> messages(
            SupabaseUserPrincipal principal,
            UUID conversationId,
            int page,
            int size
    ) {
        User user = currentUserService.require(principal);
        requireParticipant(conversationId, user);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var messages = messageRepository.findByConversationIdAndDeletedAtIsNull(
                conversationId,
                PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return new DomainDtos.PageResponse<>(messages.map(mapper::message).getContent(), messages.getNumber(),
                messages.getSize(), messages.getTotalElements(), messages.getTotalPages(), messages.isLast());
    }

    @Transactional
    public DomainDtos.MessageResponse send(
            SupabaseUserPrincipal principal,
            UUID conversationId,
            DomainDtos.SendMessageRequest request
    ) {
        User sender = currentUserService.require(principal);
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        requireParticipant(conversationId, sender);
        if (request.clientRequestId() != null) {
            var existing = messageRepository.findBySenderIdAndClientRequestId(sender.getId(), request.clientRequestId());
            if (existing.isPresent()) return mapper.message(existing.get());
        }

        ConversationMessage message = new ConversationMessage();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(request.content().trim());
        message.setClientRequestId(request.clientRequestId());
        message = messageRepository.saveAndFlush(message);
        conversation.setUpdatedAt(OffsetDateTime.now());
        conversationRepository.save(conversation);

        for (ConversationParticipant participant : participantRepository.findByConversationIdAndLeftAtIsNull(conversationId)) {
            if (!participant.getUser().getId().equals(sender.getId())) {
                notificationService.create(participant.getUser(), "NEW_MESSAGE", "New message",
                        sender.getName() + " sent a message about " + conversation.getOrder().getTitle() + ".",
                        "CONVERSATION", conversationId);
            }
        }
        return mapper.message(message);
    }

    @Transactional
    public long markRead(SupabaseUserPrincipal principal, UUID conversationId) {
        User user = currentUserService.require(principal);
        requireParticipant(conversationId, user);
        for (ConversationMessage message : messageRepository
                .findByConversationIdAndSenderIdNotAndDeletedAtIsNull(conversationId, user.getId())) {
            MessageReadId id = new MessageReadId(message.getId(), user.getId());
            if (!readRepository.existsById(id)) readRepository.save(new MessageRead(message, user));
        }
        return readRepository.countUnread(conversationId, user.getId());
    }

    @Transactional(readOnly = true)
    public long unreadCount(User user, UUID conversationId) {
        requireParticipant(conversationId, user);
        return readRepository.countUnread(conversationId, user.getId());
    }

    void requireParticipant(UUID conversationId, User user) {
        if (!participantRepository.existsByConversationIdAndUserIdAndLeftAtIsNull(conversationId, user.getId())) {
            throw new AccessDeniedException("You are not a participant in this conversation");
        }
    }
}
