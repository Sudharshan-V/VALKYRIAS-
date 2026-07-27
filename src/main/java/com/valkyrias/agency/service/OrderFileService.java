package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.exception.DomainValidationException;
import com.valkyrias.agency.exception.ResourceNotFoundException;
import com.valkyrias.agency.model.*;
import com.valkyrias.agency.repository.*;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.storage.OrderFileStorageService;
import com.valkyrias.agency.storage.OrderFileValidator;
import com.valkyrias.agency.storage.ValidatedOrderFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class OrderFileService {
    private final FileRecordRepository repository;
    private final PaymentRepository paymentRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final OrderEventRepository eventRepository;
    private final OrderService orderService;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final OrderFileValidator validator;
    private final OrderFileStorageService storage;
    private final DomainMapper mapper;

    public OrderFileService(
            FileRecordRepository repository,
            PaymentRepository paymentRepository,
            ConversationRepository conversationRepository,
            ConversationParticipantRepository participantRepository,
            OrderEventRepository eventRepository,
            OrderService orderService,
            CurrentUserService currentUserService,
            NotificationService notificationService,
            OrderFileValidator validator,
            OrderFileStorageService storage,
            DomainMapper mapper
    ) {
        this.repository = repository;
        this.paymentRepository = paymentRepository;
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.eventRepository = eventRepository;
        this.orderService = orderService;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.validator = validator;
        this.storage = storage;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<DomainDtos.FileResponse> list(SupabaseUserPrincipal principal, UUID orderId) {
        User user = currentUserService.require(principal);
        orderService.requireAccessible(orderId, user);
        return repository.findByOrderIdAndDeletedAtIsNullOrderByCreatedAtDesc(orderId).stream().map(mapper::file).toList();
    }

    @Transactional
    public DomainDtos.FileResponse upload(
            SupabaseUserPrincipal principal,
            UUID orderId,
            FileCategory category,
            MultipartFile multipart
    ) {
        User user = currentUserService.require(principal);
        ProjectOrder order = orderService.requireAccessible(orderId, user);
        authorizeUpload(user, order, category);
        ValidatedOrderFile file = validator.validate(multipart);
        UUID fileId = UUID.randomUUID();
        Conversation conversation = null;
        if (category == FileCategory.CHAT_ATTACHMENT) {
            conversation = conversationRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("This order does not have an active conversation"));
            if (!participantRepository.existsByConversationIdAndUserIdAndLeftAtIsNull(conversation.getId(), user.getId())) {
                throw new AccessDeniedException("You are not a participant in this conversation");
            }
        }

        String objectPath = storage.upload(orderId, fileId, category, file);
        try {
            FileRecord record = new FileRecord();
            record.setId(fileId);
            record.setOrder(order);
            record.setConversation(conversation);
            record.setUploadedBy(user);
            record.setStorageBucket(storage.bucket());
            record.setStoragePath(objectPath);
            record.setOriginalFilename(file.safeFilename());
            record.setContentType(file.contentType());
            record.setSizeBytes(file.sizeBytes());
            record.setCategory(category);
            record = repository.saveAndFlush(record);
            createEvent(order, user, category);
            notifyOtherParticipant(order, user, category);
            return mapper.file(record);
        } catch (RuntimeException exception) {
            try { storage.delete(objectPath); } catch (RuntimeException ignored) { }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public DomainDtos.FileDownloadResponse download(SupabaseUserPrincipal principal, UUID fileId) {
        User user = currentUserService.require(principal);
        FileRecord file = repository.findDetailedById(fileId)
                .filter(item -> item.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        ProjectOrder order = orderService.requireAccessible(file.getOrder().getId(), user);
        if (file.getCategory() == FileCategory.DELIVERABLE
                && user.getRole() == UserRole.CLIENT
                && paymentRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(order.getId(), PaymentStatus.PAID).isEmpty()) {
            throw new AccessDeniedException("The final deliverable is available after verified payment");
        }
        String signedUrl = storage.createSignedUrl(file.getStoragePath());
        return new DomainDtos.FileDownloadResponse(file.getId(), file.getOriginalFilename(), file.getContentType(),
                signedUrl, storage.signedUrlTtlSeconds());
    }

    @Transactional
    public void delete(SupabaseUserPrincipal principal, UUID fileId) {
        User user = currentUserService.require(principal);
        FileRecord file = repository.findDetailedById(fileId)
                .filter(item -> item.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        orderService.requireAccessible(file.getOrder().getId(), user);
        if (user.getRole() != UserRole.ADMIN && !file.getUploadedBy().getId().equals(user.getId())) {
            throw new AccessDeniedException("You can delete only files that you uploaded");
        }
        if (file.getOrder().getStatus() == OrderStatus.COMPLETED) {
            throw new DomainValidationException("Files on a completed order cannot be deleted");
        }
        storage.delete(file.getStoragePath());
        file.setDeletedAt(OffsetDateTime.now());
        repository.save(file);
    }

    private static void authorizeUpload(User user, ProjectOrder order, FileCategory category) {
        if (category == FileCategory.PORTFOLIO_MEDIA) {
            throw new DomainValidationException("Portfolio media uses the portfolio API, not an order upload");
        }
        if (user.getRole() == UserRole.ADMIN) return;
        if (user.getRole() == UserRole.CLIENT) {
            if (!order.getClient().getId().equals(user.getId())) throw new AccessDeniedException("You do not own this order");
            if (category != FileCategory.CLIENT_ASSET && category != FileCategory.CHAT_ATTACHMENT) {
                throw new AccessDeniedException("Clients may upload project assets or chat attachments only");
            }
            if (category == FileCategory.CLIENT_ASSET && !List.of(
                    OrderStatus.ACCEPTED, OrderStatus.IN_PROGRESS, OrderStatus.PREVIEW_READY,
                    OrderStatus.REVISION_REQUESTED, OrderStatus.APPROVED, OrderStatus.PAYMENT_PENDING,
                    OrderStatus.PAID, OrderStatus.DELIVERED
            ).contains(order.getStatus())) {
                throw new DomainValidationException("Client assets cannot be uploaded while order status is " + order.getStatus());
            }
            return;
        }
        if (order.getAssignedEditor() == null || !order.getAssignedEditor().getId().equals(user.getId())) {
            throw new AccessDeniedException("This order is not assigned to you");
        }
        if (category != FileCategory.PREVIEW && category != FileCategory.DELIVERABLE
                && category != FileCategory.CHAT_ATTACHMENT) {
            throw new AccessDeniedException("Editors may upload previews, deliverables, or chat attachments only");
        }
        if (category == FileCategory.PREVIEW
                && order.getStatus() != OrderStatus.IN_PROGRESS
                && order.getStatus() != OrderStatus.REVISION_REQUESTED) {
            throw new DomainValidationException("Previews can be uploaded only while work or revision is in progress");
        }
        if (category == FileCategory.DELIVERABLE && order.getStatus() != OrderStatus.PAID) {
            throw new DomainValidationException("Final deliverables can be uploaded only after verified payment");
        }
    }

    private void createEvent(ProjectOrder order, User user, FileCategory category) {
        OrderEvent event = new OrderEvent();
        event.setOrder(order);
        event.setActor(user);
        event.setEventType(switch (category) {
            case CLIENT_ASSET -> "CLIENT_ASSET_UPLOADED";
            case CHAT_ATTACHMENT -> "CHAT_ATTACHMENT_UPLOADED";
            case PREVIEW -> "PREVIEW_UPLOADED";
            case DELIVERABLE -> "DELIVERABLE_UPLOADED";
            case PORTFOLIO_MEDIA -> "PORTFOLIO_MEDIA_UPLOADED";
        });
        event.setFromStatus(order.getStatus());
        event.setToStatus(order.getStatus());
        eventRepository.save(event);
    }

    private void notifyOtherParticipant(ProjectOrder order, User uploader, FileCategory category) {
        User target = order.getClient().getId().equals(uploader.getId()) ? order.getAssignedEditor() : order.getClient();
        if (target == null) return;
        String type = switch (category) {
            case CLIENT_ASSET -> "ASSET_UPLOADED";
            case CHAT_ATTACHMENT -> "CHAT_ATTACHMENT";
            case PREVIEW -> "PREVIEW_UPLOADED";
            case DELIVERABLE -> "DELIVERABLE_AVAILABLE";
            case PORTFOLIO_MEDIA -> "PORTFOLIO_UPDATED";
        };
        notificationService.create(target, type, "New file uploaded",
                uploader.getName() + " uploaded a file for " + order.getTitle() + ".", "ORDER", order.getId());
    }
}
