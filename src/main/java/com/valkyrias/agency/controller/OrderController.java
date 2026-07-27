package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.OrderService;
import com.valkyrias.agency.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;
    private final ReviewService reviewService;

    public OrderController(OrderService orderService, ReviewService reviewService) {
        this.orderService = orderService;
        this.reviewService = reviewService;
    }

    @GetMapping
    public List<DomainDtos.OrderResponse> list(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return orderService.list(principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DomainDtos.OrderResponse create(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @Valid @RequestBody DomainDtos.CreateOrderRequest request
    ) { return orderService.create(principal, request); }

    @GetMapping("/{orderId}")
    public DomainDtos.OrderResponse get(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId
    ) { return orderService.get(principal, orderId); }

    @PostMapping("/{orderId}/assignments")
    public DomainDtos.AssignmentResponse assign(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId,
            @Valid @RequestBody DomainDtos.AssignEditorRequest request
    ) { return orderService.assign(principal, orderId, request); }

    @PostMapping("/{orderId}/admin-review")
    public DomainDtos.OrderResponse adminReview(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId
    ) { return orderService.markUnderReview(principal, orderId); }

    @PostMapping("/{orderId}/admin-reject")
    public DomainDtos.OrderResponse adminReject(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId,
            @Valid @RequestBody(required = false) DomainDtos.TransitionNoteRequest request
    ) { return orderService.reject(principal, orderId,
            request == null ? new DomainDtos.TransitionNoteRequest(null) : request); }

    @PostMapping("/{orderId}/assignment/accept")
    public DomainDtos.AssignmentResponse accept(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId,
            @Valid @RequestBody(required = false) DomainDtos.AssignmentResponseRequest request
    ) { return orderService.respondToAssignment(principal, orderId, true, defaultAssignmentRequest(request)); }

    @PostMapping("/{orderId}/assignment/reject")
    public DomainDtos.AssignmentResponse reject(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId,
            @Valid @RequestBody(required = false) DomainDtos.AssignmentResponseRequest request
    ) { return orderService.respondToAssignment(principal, orderId, false, defaultAssignmentRequest(request)); }

    @PostMapping("/{orderId}/start")
    public DomainDtos.OrderResponse start(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable UUID orderId) {
        return orderService.start(principal, orderId);
    }

    @PostMapping("/{orderId}/progress")
    public DomainDtos.OrderResponse progress(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId,
            @Valid @RequestBody DomainDtos.ProgressRequest request
    ) { return orderService.updateProgress(principal, orderId, request.progress()); }

    @PostMapping("/{orderId}/preview-ready")
    public DomainDtos.OrderResponse previewReady(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable UUID orderId) {
        return orderService.markPreviewReady(principal, orderId);
    }

    @PostMapping("/{orderId}/request-revision")
    public DomainDtos.OrderResponse requestRevision(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId,
            @Valid @RequestBody DomainDtos.TransitionNoteRequest request
    ) { return orderService.requestRevision(principal, orderId, request); }

    @PostMapping("/{orderId}/approve-preview")
    public DomainDtos.OrderResponse approvePreview(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable UUID orderId) {
        return orderService.approvePreview(principal, orderId);
    }

    @PostMapping("/{orderId}/deliver")
    public DomainDtos.OrderResponse deliver(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable UUID orderId) {
        return orderService.markDelivered(principal, orderId);
    }

    @PostMapping("/{orderId}/complete")
    public DomainDtos.OrderResponse complete(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable UUID orderId) {
        return orderService.complete(principal, orderId);
    }

    @GetMapping("/{orderId}/events")
    public List<DomainDtos.OrderEventResponse> events(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable UUID orderId) {
        return orderService.events(principal, orderId);
    }

    @PostMapping("/{orderId}/review")
    public DomainDtos.ReviewResponse review(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId,
            @Valid @RequestBody DomainDtos.ReviewRequest request
    ) { return reviewService.submit(principal, orderId, request); }

    private static DomainDtos.AssignmentResponseRequest defaultAssignmentRequest(DomainDtos.AssignmentResponseRequest request) {
        return request == null ? new DomainDtos.AssignmentResponseRequest(null) : request;
    }
}
