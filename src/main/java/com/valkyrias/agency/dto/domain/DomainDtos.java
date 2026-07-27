package com.valkyrias.agency.dto.domain;

import com.valkyrias.agency.model.AccountStatus;
import com.valkyrias.agency.model.AssignmentStatus;
import com.valkyrias.agency.model.FileCategory;
import com.valkyrias.agency.model.OrderStatus;
import com.valkyrias.agency.model.PaymentStatus;
import com.valkyrias.agency.model.UserRole;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class DomainDtos {
    private DomainDtos() {}

    public record ServicePackageResponse(
            UUID id,
            String name,
            String description,
            BigDecimal price,
            String currency,
            Integer deliveryDays,
            List<String> features
    ) {}

    public record ServiceResponse(
            UUID id,
            String name,
            String description,
            String category,
            BigDecimal basePrice,
            String currency,
            String deliveryEstimate,
            List<String> requiredClientInformation,
            boolean active,
            List<ServicePackageResponse> packages
    ) {}

    public record ServiceRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 3000) String description,
            @NotBlank @Size(max = 100) String category,
            @NotNull @DecimalMin("0.00") BigDecimal basePrice,
            @Size(min = 3, max = 3) String currency,
            @Size(max = 100) String deliveryEstimate,
            List<@Size(max = 120) String> requiredClientInformation,
            boolean active
    ) {}

    public record ServicePackageRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 3000) String description,
            @NotNull @DecimalMin("0.00") BigDecimal price,
            @Size(min = 3, max = 3) String currency,
            @Min(1) Integer deliveryDays,
            List<@Size(max = 300) String> features,
            boolean active,
            @Min(0) int displayOrder
    ) {}

    public record CreateOrderRequest(
            @NotBlank @Size(max = 200) String title,
            @NotNull UUID serviceId,
            UUID servicePackageId,
            @Size(max = 10000) String requirements,
            OffsetDateTime deadline,
            Map<@Size(max = 120) String, @Size(max = 5000) String> requirementFields
    ) {}

    public record AssignEditorRequest(@NotNull UUID editorUserId) {}

    public record AssignmentResponseRequest(@Size(max = 1000) String note) {}

    public record TransitionNoteRequest(@Size(max = 5000) String note) {}

    public record ProgressRequest(@Min(0) @Max(100) int progress) {}

    public record OrderResponse(
            UUID id,
            UUID clientId,
            String clientName,
            UUID assignedEditorId,
            String assignedEditorName,
            UUID serviceId,
            String serviceName,
            UUID servicePackageId,
            String servicePackageName,
            String title,
            String requirements,
            OrderStatus status,
            BigDecimal budget,
            String currency,
            int progress,
            OffsetDateTime deadline,
            OffsetDateTime submittedAt,
            OffsetDateTime completedAt,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            long version,
            UUID conversationId
    ) {}

    public record AssignmentResponse(
            UUID id,
            UUID orderId,
            String orderTitle,
            UUID editorId,
            String editorName,
            UUID assignedById,
            AssignmentStatus status,
            String responseNote,
            OffsetDateTime assignedAt,
            OffsetDateTime respondedAt
    ) {}

    public record ConversationResponse(UUID id, UUID orderId, OffsetDateTime createdAt) {}

    public record SendMessageRequest(
            @NotBlank @Size(max = 10000) String content,
            UUID clientRequestId
    ) {}

    public record MessageResponse(
            UUID id,
            UUID conversationId,
            UUID senderId,
            String senderName,
            String senderAvatarUrl,
            String content,
            String messageType,
            OffsetDateTime createdAt,
            OffsetDateTime editedAt,
            UUID clientRequestId
    ) {}

    public record PageResponse<T>(
            List<T> items,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean last
    ) {}

    public record FileResponse(
            UUID id,
            UUID orderId,
            UUID uploadedById,
            String uploadedByName,
            String originalFilename,
            String contentType,
            long sizeBytes,
            FileCategory category,
            OffsetDateTime createdAt
    ) {}

    public record FileDownloadResponse(UUID id, String filename, String contentType, String signedUrl, long expiresInSeconds) {}

    public record NotificationResponse(
            UUID id,
            String type,
            String title,
            String body,
            String relatedEntityType,
            UUID relatedEntityId,
            OffsetDateTime readAt,
            OffsetDateTime createdAt
    ) {}

    public record PaymentResponse(
            UUID id,
            UUID orderId,
            BigDecimal amount,
            BigDecimal orderAmount,
            BigDecimal depositAmount,
            BigDecimal discountAmount,
            BigDecimal gstAmount,
            String couponCode,
            String currency,
            String provider,
            String providerOrderId,
            String providerPaymentId,
            PaymentStatus status,
            OffsetDateTime createdAt,
            OffsetDateTime paidAt,
            String checkoutKey
    ) {}

    public record CreatePaymentRequest(
            @NotBlank @Size(max = 50) String provider,
            @Size(max = 32) String couponCode
    ) {
        public CreatePaymentRequest(String provider) { this(provider, null); }
    }

    public record PaymentQuoteResponse(
            UUID orderId,
            BigDecimal orderAmount,
            BigDecimal depositAmount,
            BigDecimal discountAmount,
            BigDecimal discountPercent,
            BigDecimal gstAmount,
            BigDecimal totalAmount,
            String currency,
            String couponCode
    ) {}

    public record PaymentQuoteRequest(@Size(max = 32) String couponCode) {}

    public record CouponResponse(
            UUID id,
            String code,
            BigDecimal discountPercent,
            boolean active,
            OffsetDateTime expiresAt,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {}

    public record CouponRequest(
            @Size(max = 32) @Pattern(regexp = "^$|^[A-Za-z0-9_-]{4,32}$",
                    message = "Coupon code must contain 4-32 letters, numbers, underscores, or hyphens")
            String code,
            @NotNull @DecimalMin(value = "0.01") @DecimalMax(value = "99.99") @Digits(integer = 2, fraction = 2)
            BigDecimal discountPercent,
            boolean active,
            OffsetDateTime expiresAt
    ) {}

    public record VerifyPaymentRequest(
            @NotBlank @Size(max = 255) String providerPaymentId,
            @NotBlank @Size(max = 2000) String verificationReference
    ) {}

    public record RazorpayVerificationRequest(
            @NotBlank @Size(max = 255) String razorpayOrderId,
            @NotBlank @Size(max = 255) String razorpayPaymentId,
            @NotBlank @Size(max = 255) String razorpaySignature
    ) {}

    public record ReviewRequest(@Min(1) @Max(5) int rating, @Size(max = 3000) String comment) {}

    public record ReviewResponse(UUID id, UUID orderId, int rating, String comment, OffsetDateTime createdAt) {}

    public record OrderEventResponse(
            UUID id,
            UUID actorId,
            String actorName,
            String eventType,
            OrderStatus fromStatus,
            OrderStatus toStatus,
            String details,
            OffsetDateTime createdAt
    ) {}

    public record PortalDashboardResponse(
            List<OrderResponse> orders,
            List<AssignmentResponse> pendingAssignments,
            List<NotificationResponse> notifications,
            long unreadNotifications,
            BigDecimal paidTotal,
            BigDecimal outstandingTotal,
            long activeOrders,
            long completedOrders
    ) {}

    public record AdminDashboardResponse(
            long totalUsers,
            long clientCount,
            long editorCount,
            long pendingEditorApprovals,
            long totalOrders,
            long activeOrders,
            long pendingOrders,
            long completedOrders,
            long cancelledOrders,
            BigDecimal verifiedRevenue,
            List<OrderResponse> recentOrders,
            List<AdminUserResponse> recentUsers,
            List<OrderEventResponse> recentActivity,
            List<AdminContactMessageResponse> recentContactMessages,
            PaymentStatusSummary paymentStates
    ) {}

    public record AdminContactMessageResponse(
            Long id,
            String name,
            String email,
            String subject,
            String message,
            LocalDateTime submittedAt
    ) {}

    public record PaymentStatusSummary(
            long pending,
            long requiresAction,
            long paid,
            long failed,
            long refunded,
            long cancelled
    ) {}

    public record AdminUserResponse(
            UUID id,
            UUID supabaseUserId,
            String name,
            String email,
            UserRole role,
            AccountStatus accountStatus,
            OffsetDateTime createdAt
    ) {}

    public record AvailableEditorResponse(
            UUID userId,
            String name,
            String email,
            AccountStatus accountStatus,
            String availabilityStatus,
            List<String> skills,
            long activeOrderCount
    ) {}

    public record AdminUserUpdateRequest(UserRole role, AccountStatus accountStatus) {}

    public record AdminNotificationRequest(
            @NotNull UUID userId,
            @NotBlank @Size(max = 60) String type,
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 2000) String body
    ) {}
}
