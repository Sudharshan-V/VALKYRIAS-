package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.exception.DomainValidationException;
import com.valkyrias.agency.model.OrderReview;
import com.valkyrias.agency.model.OrderStatus;
import com.valkyrias.agency.model.ProjectOrder;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.OrderReviewRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ReviewService {
    private final OrderReviewRepository repository;
    private final OrderService orderService;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public ReviewService(OrderReviewRepository repository, OrderService orderService,
                         CurrentUserService currentUserService, NotificationService notificationService) {
        this.repository = repository;
        this.orderService = orderService;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    @Transactional
    public DomainDtos.ReviewResponse submit(
            SupabaseUserPrincipal principal,
            UUID orderId,
            DomainDtos.ReviewRequest request
    ) {
        User client = currentUserService.requireRole(principal, UserRole.CLIENT);
        ProjectOrder order = orderService.requireOrder(orderId);
        if (!order.getClient().getId().equals(client.getId())) throw new AccessDeniedException("You do not own this order");
        if (order.getStatus() != OrderStatus.COMPLETED || order.getAssignedEditor() == null) {
            throw new DomainValidationException("A review can be submitted only after the assigned order is completed");
        }
        OrderReview review = repository.findByOrderId(orderId).orElseGet(OrderReview::new);
        review.setOrder(order);
        review.setClient(client);
        review.setEditor(order.getAssignedEditor());
        review.setRating(request.rating());
        review.setComment(request.comment() == null || request.comment().isBlank() ? null : request.comment().trim());
        review = repository.save(review);
        notificationService.create(order.getAssignedEditor(), "REVIEW_RECEIVED", "New review",
                "A client reviewed " + order.getTitle() + ".", "ORDER", order.getId());
        return new DomainDtos.ReviewResponse(review.getId(), orderId, review.getRating(), review.getComment(), review.getCreatedAt());
    }
}
