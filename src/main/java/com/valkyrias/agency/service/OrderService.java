package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.exception.DomainValidationException;
import com.valkyrias.agency.exception.ResourceNotFoundException;
import com.valkyrias.agency.model.*;
import com.valkyrias.agency.repository.*;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class OrderService {
    private static final Set<OrderStatus> ACTIVE = EnumSet.of(
            OrderStatus.SUBMITTED, OrderStatus.UNDER_REVIEW, OrderStatus.EDITOR_ASSIGNED,
            OrderStatus.ACCEPTED, OrderStatus.IN_PROGRESS, OrderStatus.PREVIEW_READY,
            OrderStatus.REVISION_REQUESTED, OrderStatus.APPROVED, OrderStatus.PAYMENT_PENDING,
            OrderStatus.PAID, OrderStatus.DELIVERED
    );

    private final ProjectOrderRepository orderRepository;
    private final ServiceOfferingRepository serviceRepository;
    private final ServicePackageRepository packageRepository;
    private final OrderRequirementRepository requirementRepository;
    private final OrderAssignmentRepository assignmentRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final RevisionRequestRepository revisionRepository;
    private final OrderEventRepository eventRepository;
    private final FileRecordRepository fileRecordRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final DomainMapper mapper;

    public OrderService(
            ProjectOrderRepository orderRepository,
            ServiceOfferingRepository serviceRepository,
            ServicePackageRepository packageRepository,
            OrderRequirementRepository requirementRepository,
            OrderAssignmentRepository assignmentRepository,
            ConversationRepository conversationRepository,
            ConversationParticipantRepository participantRepository,
            RevisionRequestRepository revisionRepository,
            OrderEventRepository eventRepository,
            FileRecordRepository fileRecordRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            NotificationService notificationService,
            DomainMapper mapper
    ) {
        this.orderRepository = orderRepository;
        this.serviceRepository = serviceRepository;
        this.packageRepository = packageRepository;
        this.requirementRepository = requirementRepository;
        this.assignmentRepository = assignmentRepository;
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.revisionRepository = revisionRepository;
        this.eventRepository = eventRepository;
        this.fileRecordRepository = fileRecordRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<DomainDtos.OrderResponse> list(SupabaseUserPrincipal principal) {
        User user = currentUserService.require(principal);
        List<ProjectOrder> orders = switch (user.getRole()) {
            case CLIENT -> orderRepository.findByClientIdOrderByUpdatedAtDesc(user.getId());
            case EDITOR -> orderRepository.findByAssignedEditorIdOrderByUpdatedAtDesc(user.getId());
            case ADMIN -> orderRepository.findAllByOrderByUpdatedAtDesc();
        };
        return orders.stream().map(mapper::order).toList();
    }

    @Transactional(readOnly = true)
    public DomainDtos.OrderResponse get(SupabaseUserPrincipal principal, UUID orderId) {
        User user = currentUserService.require(principal);
        return mapper.order(requireAccessible(orderId, user));
    }

    @Transactional
    public DomainDtos.OrderResponse create(SupabaseUserPrincipal principal, DomainDtos.CreateOrderRequest request) {
        User client = currentUserService.requireRole(principal, UserRole.CLIENT);
        ServiceOffering service = serviceRepository.findById(request.serviceId())
                .filter(ServiceOffering::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Active service not found"));
        ServicePackage selectedPackage = null;
        if (request.servicePackageId() != null) {
            selectedPackage = packageRepository.findById(request.servicePackageId())
                    .filter(ServicePackage::isActive)
                    .filter(item -> item.getService().getId().equals(service.getId()))
                    .orElseThrow(() -> new DomainValidationException("The selected package does not belong to this service"));
        }

        ProjectOrder order = new ProjectOrder();
        order.setClient(client);
        order.setService(service);
        order.setServicePackage(selectedPackage);
        order.setTitle(request.title().trim());
        order.setRequirements(normalize(request.requirements()));
        order.setBudget(selectedPackage == null ? service.getBasePrice() : selectedPackage.getPrice());
        order.setCurrency(selectedPackage == null ? service.getCurrency() : selectedPackage.getCurrency());
        order.setDeadline(request.deadline());
        order.setStatus(OrderStatus.SUBMITTED);
        order.setSubmittedAt(OffsetDateTime.now());
        ProjectOrder savedOrder = orderRepository.saveAndFlush(order);

        if (request.requirementFields() != null) {
            for (Map.Entry<String, String> entry : request.requirementFields().entrySet()) {
                if (entry.getKey() == null || entry.getKey().isBlank()) continue;
                OrderRequirement requirement = new OrderRequirement();
                requirement.setOrder(savedOrder);
                requirement.setRequirementKey(entry.getKey().trim());
                requirement.setRequirementValue(normalize(entry.getValue()));
                requirementRepository.save(requirement);
            }
        }

        event(savedOrder, client, "ORDER_SUBMITTED", null, OrderStatus.SUBMITTED);
        notificationService.create(client, "ORDER_SUBMITTED", "Order submitted",
                "Your order has been submitted for review.", "ORDER", savedOrder.getId());
        userRepository.findByRoleAndAccountStatusOrderByNameAsc(UserRole.ADMIN, AccountStatus.ACTIVE)
                .forEach(admin -> notificationService.create(admin, "ORDER_SUBMITTED", "New order submitted",
                        client.getName() + " submitted " + savedOrder.getTitle() + ".", "ORDER", savedOrder.getId()));
        return mapper.order(savedOrder);
    }

    @Transactional
    public DomainDtos.AssignmentResponse assign(
            SupabaseUserPrincipal principal,
            UUID orderId,
            DomainDtos.AssignEditorRequest request
    ) {
        User admin = currentUserService.requireRole(principal, UserRole.ADMIN);
        ProjectOrder order = requireOrder(orderId);
        requireStatus(order, OrderStatus.SUBMITTED, OrderStatus.UNDER_REVIEW, OrderStatus.EDITOR_ASSIGNED);
        User editor = userRepository.findById(request.editorUserId())
                .filter(user -> user.getRole() == UserRole.EDITOR && user.getAccountStatus() == AccountStatus.ACTIVE)
                .orElseThrow(() -> new DomainValidationException("An active editor account is required"));

        assignmentRepository.findFirstByOrderIdAndStatusInOrderByAssignedAtDesc(
                orderId, List.of(AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED)
        ).ifPresent(existing -> {
            if (existing.getStatus() == AssignmentStatus.ACCEPTED) {
                throw new DomainValidationException("An accepted assignment cannot be replaced in the current order state");
            }
            existing.setStatus(AssignmentStatus.CANCELLED);
            existing.setRespondedAt(OffsetDateTime.now());
            assignmentRepository.save(existing);
        });

        OrderStatus previous = order.getStatus();
        order.setAssignedEditor(editor);
        order.setStatus(OrderStatus.EDITOR_ASSIGNED);
        orderRepository.saveAndFlush(order);

        OrderAssignment assignment = new OrderAssignment();
        assignment.setOrder(order);
        assignment.setEditor(editor);
        assignment.setAssignedBy(admin);
        assignment = assignmentRepository.save(assignment);
        event(order, admin, "EDITOR_ASSIGNED", previous, OrderStatus.EDITOR_ASSIGNED);
        notificationService.create(editor, "EDITOR_ASSIGNED", "New assignment",
                "You have been invited to work on " + order.getTitle() + ".", "ORDER", order.getId());
        notificationService.create(order.getClient(), "EDITOR_ASSIGNED", "Editor assigned",
                "An editor has been assigned to your order.", "ORDER", order.getId());
        return mapper.assignment(assignment);
    }

    @Transactional
    public DomainDtos.OrderResponse markUnderReview(SupabaseUserPrincipal principal, UUID orderId) {
        User admin = currentUserService.requireRole(principal, UserRole.ADMIN);
        ProjectOrder order = requireOrder(orderId);
        DomainDtos.OrderResponse response = transition(order, admin, OrderStatus.UNDER_REVIEW,
                "ORDER_UNDER_REVIEW", OrderStatus.SUBMITTED);
        notificationService.create(order.getClient(), "ORDER_UNDER_REVIEW", "Order under review",
                "Your order is being reviewed for editor assignment.", "ORDER", order.getId());
        return response;
    }

    @Transactional
    public DomainDtos.OrderResponse reject(SupabaseUserPrincipal principal, UUID orderId, DomainDtos.TransitionNoteRequest request) {
        User admin = currentUserService.requireRole(principal, UserRole.ADMIN);
        ProjectOrder order = requireOrder(orderId);
        DomainDtos.OrderResponse response = transition(order, admin, OrderStatus.REJECTED,
                "ORDER_REJECTED", OrderStatus.SUBMITTED, OrderStatus.UNDER_REVIEW);
        notificationService.create(order.getClient(), "ORDER_REJECTED", "Order rejected",
                request.note() == null || request.note().isBlank()
                        ? "Your order could not be accepted in its current form."
                        : request.note().trim(),
                "ORDER", order.getId());
        return response;
    }

    @Transactional
    public DomainDtos.AssignmentResponse respondToAssignment(
            SupabaseUserPrincipal principal,
            UUID orderId,
            boolean accept,
            DomainDtos.AssignmentResponseRequest request
    ) {
        User editor = currentUserService.requireRole(principal, UserRole.EDITOR);
        ProjectOrder order = requireOrder(orderId);
        if (order.getAssignedEditor() == null || !order.getAssignedEditor().getId().equals(editor.getId())) {
            throw new AccessDeniedException("This order is not assigned to you");
        }
        requireStatus(order, OrderStatus.EDITOR_ASSIGNED);
        OrderAssignment assignment = assignmentRepository.findFirstByOrderIdAndStatusInOrderByAssignedAtDesc(
                orderId, List.of(AssignmentStatus.PENDING)
        ).filter(item -> item.getEditor().getId().equals(editor.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Pending assignment not found"));
        assignment.setResponseNote(normalize(request.note()));
        assignment.setRespondedAt(OffsetDateTime.now());
        OrderStatus previous = order.getStatus();
        if (accept) {
            assignment.setStatus(AssignmentStatus.ACCEPTED);
            order.setStatus(OrderStatus.ACCEPTED);
            ensureConversation(order);
            event(order, editor, "ASSIGNMENT_ACCEPTED", previous, OrderStatus.ACCEPTED);
            notificationService.create(order.getClient(), "ASSIGNMENT_ACCEPTED", "Assignment accepted",
                    "Your assigned editor accepted the order.", "ORDER", order.getId());
        } else {
            assignment.setStatus(AssignmentStatus.REJECTED);
            order.setAssignedEditor(null);
            order.setStatus(OrderStatus.UNDER_REVIEW);
            event(order, editor, "ASSIGNMENT_REJECTED", previous, OrderStatus.UNDER_REVIEW);
            notificationService.create(order.getClient(), "ASSIGNMENT_REJECTED", "Assignment update",
                    "The order returned to review for another editor assignment.", "ORDER", order.getId());
            userRepository.findByRoleAndAccountStatusOrderByNameAsc(UserRole.ADMIN, AccountStatus.ACTIVE)
                    .forEach(admin -> notificationService.create(admin, "ASSIGNMENT_REJECTED", "Assignment rejected",
                            editor.getName() + " rejected " + order.getTitle() + ".", "ORDER", order.getId()));
        }
        orderRepository.save(order);
        return mapper.assignment(assignmentRepository.save(assignment));
    }

    @Transactional
    public DomainDtos.OrderResponse start(SupabaseUserPrincipal principal, UUID orderId) {
        User editor = requireAssignedEditor(principal, orderId);
        return transition(requireOrder(orderId), editor, OrderStatus.IN_PROGRESS, "ORDER_STARTED", OrderStatus.ACCEPTED);
    }

    @Transactional
    public DomainDtos.OrderResponse updateProgress(SupabaseUserPrincipal principal, UUID orderId, int progress) {
        User editor = requireAssignedEditor(principal, orderId);
        ProjectOrder order = requireOrder(orderId);
        requireStatus(order, OrderStatus.IN_PROGRESS, OrderStatus.REVISION_REQUESTED);
        order.setProgress(progress);
        event(order, editor, "PROGRESS_UPDATED", order.getStatus(), order.getStatus());
        notificationService.create(order.getClient(), "PROGRESS_UPDATED", "Project progress updated",
                "Your order progress is now " + progress + "%.", "ORDER", order.getId());
        return mapper.order(orderRepository.save(order));
    }

    @Transactional
    public DomainDtos.OrderResponse markPreviewReady(SupabaseUserPrincipal principal, UUID orderId) {
        User editor = requireAssignedEditor(principal, orderId);
        ProjectOrder order = requireOrder(orderId);
        if (!fileRecordRepository.existsByOrderIdAndCategoryAndDeletedAtIsNull(orderId, FileCategory.PREVIEW)) {
            throw new DomainValidationException("Upload a preview before marking it ready for review");
        }
        DomainDtos.OrderResponse response = transition(order, editor, OrderStatus.PREVIEW_READY,
                "PREVIEW_READY", OrderStatus.IN_PROGRESS, OrderStatus.REVISION_REQUESTED);
        notificationService.create(order.getClient(), "PREVIEW_READY", "Preview ready",
                "A new preview is ready for review.", "ORDER", order.getId());
        return response;
    }

    @Transactional
    public DomainDtos.OrderResponse requestRevision(
            SupabaseUserPrincipal principal,
            UUID orderId,
            DomainDtos.TransitionNoteRequest request
    ) {
        User client = currentUserService.requireRole(principal, UserRole.CLIENT);
        ProjectOrder order = requireOwnedOrder(orderId, client);
        if (request.note() == null || request.note().isBlank()) {
            throw new DomainValidationException("Revision notes are required");
        }
        requireStatus(order, OrderStatus.PREVIEW_READY);
        RevisionRequest revision = new RevisionRequest();
        revision.setOrder(order);
        revision.setRequestedBy(client);
        revision.setNotes(request.note().trim());
        revisionRepository.save(revision);
        DomainDtos.OrderResponse response = transition(order, client, OrderStatus.REVISION_REQUESTED,
                "REVISION_REQUESTED", OrderStatus.PREVIEW_READY);
        notificationService.create(order.getAssignedEditor(), "REVISION_REQUESTED", "Revision requested",
                "The client requested changes to " + order.getTitle() + ".", "ORDER", order.getId());
        return response;
    }

    @Transactional
    public DomainDtos.OrderResponse approvePreview(SupabaseUserPrincipal principal, UUID orderId) {
        User client = currentUserService.requireRole(principal, UserRole.CLIENT);
        ProjectOrder order = requireOwnedOrder(orderId, client);
        DomainDtos.OrderResponse response = transition(order, client, OrderStatus.APPROVED,
                "PREVIEW_APPROVED", OrderStatus.PREVIEW_READY);
        notificationService.create(order.getAssignedEditor(), "PREVIEW_APPROVED", "Preview approved",
                "The client approved the preview.", "ORDER", order.getId());
        return response;
    }

    @Transactional
    public DomainDtos.OrderResponse markDelivered(SupabaseUserPrincipal principal, UUID orderId) {
        User actor = currentUserService.require(principal);
        ProjectOrder order = requireOrder(orderId);
        if (actor.getRole() != UserRole.ADMIN
                && (actor.getRole() != UserRole.EDITOR || order.getAssignedEditor() == null
                || !order.getAssignedEditor().getId().equals(actor.getId()))) {
            throw new AccessDeniedException("Only the assigned editor or an administrator can deliver this order");
        }
        if (!fileRecordRepository.existsByOrderIdAndCategoryAndDeletedAtIsNull(orderId, FileCategory.DELIVERABLE)) {
            throw new DomainValidationException("Upload a final deliverable before marking the order delivered");
        }
        DomainDtos.OrderResponse response = transition(order, actor, OrderStatus.DELIVERED,
                "ORDER_DELIVERED", OrderStatus.PAID);
        notificationService.create(order.getClient(), "DELIVERABLE_AVAILABLE", "Deliverable available",
                "The final deliverable is ready to download.", "ORDER", order.getId());
        return response;
    }

    @Transactional
    public DomainDtos.OrderResponse complete(SupabaseUserPrincipal principal, UUID orderId) {
        User actor = currentUserService.require(principal);
        ProjectOrder order = requireOrder(orderId);
        if (actor.getRole() != UserRole.ADMIN && !order.getClient().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Only the client or an administrator can complete this order");
        }
        transition(order, actor, OrderStatus.COMPLETED,
                "ORDER_COMPLETED", OrderStatus.DELIVERED);
        order.setProgress(100);
        order.setCompletedAt(OffsetDateTime.now());
        orderRepository.saveAndFlush(order);
        if (order.getAssignedEditor() != null) {
            notificationService.create(order.getAssignedEditor(), "ORDER_COMPLETED", "Order completed",
                    "The client completed " + order.getTitle() + ".", "ORDER", order.getId());
        }
        return mapper.order(order);
    }

    @Transactional(readOnly = true)
    public List<DomainDtos.OrderEventResponse> events(SupabaseUserPrincipal principal, UUID orderId) {
        User user = currentUserService.require(principal);
        requireAccessible(orderId, user);
        return eventRepository.findTop100ByOrderIdOrderByCreatedAtDesc(orderId).stream().map(mapper::event).toList();
    }

    ProjectOrder requireAccessible(UUID orderId, User user) {
        ProjectOrder order = requireOrder(orderId);
        if (user.getRole() == UserRole.ADMIN
                || order.getClient().getId().equals(user.getId())
                || (order.getAssignedEditor() != null && order.getAssignedEditor().getId().equals(user.getId()))) {
            return order;
        }
        throw new AccessDeniedException("You do not have access to this order");
    }

    ProjectOrder requireOrder(UUID orderId) {
        return orderRepository.findDetailedById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    private ProjectOrder requireOwnedOrder(UUID orderId, User client) {
        ProjectOrder order = requireOrder(orderId);
        if (!order.getClient().getId().equals(client.getId())) {
            throw new AccessDeniedException("You do not own this order");
        }
        return order;
    }

    private User requireAssignedEditor(SupabaseUserPrincipal principal, UUID orderId) {
        User editor = currentUserService.requireRole(principal, UserRole.EDITOR);
        ProjectOrder order = requireOrder(orderId);
        if (order.getAssignedEditor() == null || !order.getAssignedEditor().getId().equals(editor.getId())) {
            throw new AccessDeniedException("This order is not assigned to you");
        }
        return editor;
    }

    private void ensureConversation(ProjectOrder order) {
        if (conversationRepository.findByOrderId(order.getId()).isPresent()) return;
        Conversation conversation = new Conversation();
        conversation.setOrder(order);
        conversation = conversationRepository.saveAndFlush(conversation);
        participantRepository.save(new ConversationParticipant(conversation, order.getClient()));
        participantRepository.save(new ConversationParticipant(conversation, order.getAssignedEditor()));
    }

    private DomainDtos.OrderResponse transition(
            ProjectOrder order,
            User actor,
            OrderStatus target,
            String eventType,
            OrderStatus... allowedFrom
    ) {
        requireStatus(order, allowedFrom);
        OrderStatus previous = order.getStatus();
        order.setStatus(target);
        orderRepository.saveAndFlush(order);
        event(order, actor, eventType, previous, target);
        return mapper.order(order);
    }

    private void event(ProjectOrder order, User actor, String type, OrderStatus from, OrderStatus to) {
        OrderEvent event = new OrderEvent();
        event.setOrder(order);
        event.setActor(actor);
        event.setEventType(type);
        event.setFromStatus(from);
        event.setToStatus(to);
        eventRepository.save(event);
    }

    private static void requireStatus(ProjectOrder order, OrderStatus... allowed) {
        for (OrderStatus status : allowed) {
            if (order.getStatus() == status) return;
        }
        throw new DomainValidationException("Order action is not valid while status is " + order.getStatus());
    }

    public static Set<OrderStatus> activeStatuses() { return ACTIVE; }
    private static String normalize(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
