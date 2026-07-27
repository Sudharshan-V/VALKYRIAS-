package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.exception.DomainValidationException;
import com.valkyrias.agency.model.*;
import com.valkyrias.agency.repository.*;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.storage.OrderFileStorageService;
import com.valkyrias.agency.storage.ValidatedOrderFile;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {
        "app.seed-users.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:dynamic-domain-tests;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.h2.console.enabled=false",
        "supabase.storage.max-file-bytes=100"
})
@Import(DynamicDomainIntegrationTest.StorageConfiguration.class)
@Transactional
class DynamicDomainIntegrationTest {
    @Autowired private UserRepository userRepository;
    @Autowired private ServiceOfferingRepository serviceRepository;
    @Autowired private ProjectOrderRepository orderRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private OrderEventRepository eventRepository;
    @Autowired private UserNotificationRepository notificationRepository;
    @Autowired private OrderReviewRepository reviewRepository;
    @Autowired private ContactMessageRepository contactMessageRepository;
    @Autowired private OrderService orderService;
    @Autowired private ConversationService conversationService;
    @Autowired private OrderFileService fileService;
    @Autowired private PaymentService paymentService;
    @Autowired private ReviewService reviewService;
    @Autowired private DashboardService dashboardService;
    @Autowired private AdminManagementService adminManagementService;
    @Autowired private CouponService couponService;

    @Test
    void completeWorkflowPersistsAndEnforcesClientEditorIsolation() {
        UUID receiptOrderId = UUID.randomUUID();
        String firstReceipt = PaymentService.razorpayReceipt(receiptOrderId);
        String secondReceipt = PaymentService.razorpayReceipt(receiptOrderId);
        assertThat(firstReceipt).hasSizeLessThanOrEqualTo(40).matches("[A-Za-z0-9_]+");
        assertThat(secondReceipt).isNotEqualTo(firstReceipt);

        Identity client = identity("Client One", "client-one@example.test", UserRole.CLIENT);
        Identity otherClient = identity("Client Two", "client-two@example.test", UserRole.CLIENT);
        Identity editor = identity("Editor One", "editor-one@example.test", UserRole.EDITOR);
        Identity unrelatedEditor = identity("Editor Two", "editor-two@example.test", UserRole.EDITOR);
        Identity admin = identity("Administrator", "admin@example.test", UserRole.ADMIN);
        ServiceOffering offering = service("Cinematic Edit", new BigDecimal("15000.00"));

        DomainDtos.OrderResponse created = orderService.create(client.principal(), new DomainDtos.CreateOrderRequest(
                "Launch film", offering.getId(), null, "Edit source footage into a launch film", null,
                Map.of("format", "4K", "duration", "90 seconds")
        ));
        orderService.create(otherClient.principal(), new DomainDtos.CreateOrderRequest(
                "Other client order", offering.getId(), null, "Unrelated requirements", null, Map.of()
        ));

        assertThat(orderService.list(client.principal())).extracting(DomainDtos.OrderResponse::id)
                .containsExactly(created.id());
        assertThat(orderService.list(editor.principal())).isEmpty();
        assertThatThrownBy(() -> orderService.get(otherClient.principal(), created.id()))
                .isInstanceOf(AccessDeniedException.class);

        orderService.markUnderReview(admin.principal(), created.id());
        orderService.assign(admin.principal(), created.id(), new DomainDtos.AssignEditorRequest(editor.user().getId()));
        assertThat(orderService.list(editor.principal())).extracting(DomainDtos.OrderResponse::id)
                .containsExactly(created.id());
        assertThatThrownBy(() -> orderService.start(unrelatedEditor.principal(), created.id()))
                .isInstanceOf(AccessDeniedException.class);

        orderService.respondToAssignment(editor.principal(), created.id(), true,
                new DomainDtos.AssignmentResponseRequest("Accepted"));
        UUID conversationId = conversationRepository.findByOrderId(created.id()).orElseThrow().getId();
        assertThat(conversationRepository.count()).isEqualTo(1);
        assertThatThrownBy(() -> conversationService.forOrder(unrelatedEditor.principal(), created.id()))
                .isInstanceOf(AccessDeniedException.class);

        UUID requestId = UUID.randomUUID();
        DomainDtos.MessageResponse first = conversationService.send(client.principal(), conversationId,
                new DomainDtos.SendMessageRequest("The source files are ready.", requestId));
        DomainDtos.MessageResponse duplicate = conversationService.send(client.principal(), conversationId,
                new DomainDtos.SendMessageRequest("Duplicate retry", requestId));
        assertThat(duplicate.id()).isEqualTo(first.id());
        assertThat(conversationService.unreadCount(editor.user(), conversationId)).isEqualTo(1);
        assertThat(conversationService.markRead(editor.principal(), conversationId)).isZero();
        assertThatThrownBy(() -> conversationService.messages(unrelatedEditor.principal(), conversationId, 0, 20))
                .isInstanceOf(AccessDeniedException.class);

        orderService.start(editor.principal(), created.id());
        assertThatThrownBy(() -> orderService.markPreviewReady(editor.principal(), created.id()))
                .isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("Upload a preview");
        DomainDtos.FileResponse preview = fileService.upload(editor.principal(), created.id(), FileCategory.PREVIEW,
                png("preview.png"));
        assertThatThrownBy(() -> fileService.download(otherClient.principal(), preview.id()))
                .isInstanceOf(AccessDeniedException.class);

        orderService.markPreviewReady(editor.principal(), created.id());
        orderService.requestRevision(client.principal(), created.id(),
                new DomainDtos.TransitionNoteRequest("Reduce the opening title duration."));
        orderService.updateProgress(editor.principal(), created.id(), 80);
        orderService.markPreviewReady(editor.principal(), created.id());
        orderService.approvePreview(client.principal(), created.id());

        DomainDtos.CouponResponse coupon = couponService.create(admin.principal(), new DomainDtos.CouponRequest(
                "SAVE10", new BigDecimal("10.00"), true, OffsetDateTime.now().plusDays(1)));
        assertThatThrownBy(() -> couponService.list(client.principal()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> couponService.create(admin.principal(), new DomainDtos.CouponRequest(
                "save10", new BigDecimal("5.00"), true, null)))
                .isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("already exists");
        DomainDtos.PaymentQuoteResponse discountedQuote = paymentService.quote(
                client.principal(), created.id(), new DomainDtos.PaymentQuoteRequest(coupon.code().toLowerCase()));
        assertThat(discountedQuote.depositAmount()).isEqualByComparingTo("3000.00");
        assertThat(discountedQuote.discountAmount()).isEqualByComparingTo("300.00");
        assertThat(discountedQuote.gstAmount()).isEqualByComparingTo("486.00");
        assertThat(discountedQuote.totalAmount()).isEqualByComparingTo("3186.00");

        DomainDtos.PaymentResponse payment = paymentService.initiate(client.principal(), created.id(),
                new DomainDtos.CreatePaymentRequest("MANUAL"));
        assertThat(payment.status()).isEqualTo(PaymentStatus.PENDING);
        assertThat(payment.providerOrderId()).isNull();
        assertThat(payment.orderAmount()).isEqualByComparingTo("15000.00");
        assertThat(payment.depositAmount()).isEqualByComparingTo("3000.00");
        assertThat(payment.gstAmount()).isEqualByComparingTo("540.00");
        assertThat(payment.amount()).isEqualByComparingTo("3540.00");
        paymentService.recordVerified(admin.principal(), payment.id(),
                new DomainDtos.VerifyPaymentRequest("verified-payment-reference", "verified by trusted test adapter"));

        DomainDtos.FileResponse deliverable = fileService.upload(editor.principal(), created.id(), FileCategory.DELIVERABLE,
                png("final.png"));
        assertThat(fileService.download(client.principal(), deliverable.id()).signedUrl())
                .contains(deliverable.id().toString());
        orderService.markDelivered(editor.principal(), created.id());
        orderService.complete(client.principal(), created.id());
        reviewService.submit(client.principal(), created.id(), new DomainDtos.ReviewRequest(5, "Excellent delivery"));

        ContactMessage supportMessage = new ContactMessage();
        supportMessage.setName("Support requester");
        supportMessage.setEmail("support-requester@example.test");
        supportMessage.setSubject("Order support");
        supportMessage.setMessage("Please review the completed order.");
        contactMessageRepository.save(supportMessage);
        adminManagementService.createNotification(admin.principal(), new DomainDtos.AdminNotificationRequest(
                otherClient.user().getId(), "ADMIN_MESSAGE", "Account notice", "A persisted administrator message."
        ));

        ProjectOrder stored = orderRepository.findDetailedById(created.id()).orElseThrow();
        assertThat(stored.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(stored.getProgress()).isEqualTo(100);
        assertThat(reviewRepository.findByOrderId(created.id())).isPresent();
        assertThat(eventRepository.findTop100ByOrderIdOrderByCreatedAtDesc(created.id()))
                .extracting(OrderEvent::getEventType)
                .contains("ORDER_SUBMITTED", "EDITOR_ASSIGNED", "ASSIGNMENT_ACCEPTED", "PREVIEW_READY",
                        "REVISION_REQUESTED", "PREVIEW_APPROVED", "PAYMENT_VERIFIED", "ORDER_DELIVERED", "ORDER_COMPLETED");
        assertThat(notificationRepository.countByUserIdAndReadAtIsNull(client.user().getId())).isPositive();
        assertThat(notificationRepository.countByUserIdAndReadAtIsNull(editor.user().getId())).isPositive();
        assertThat(notificationRepository.countByUserIdAndReadAtIsNull(otherClient.user().getId())).isPositive();
        DomainDtos.AdminDashboardResponse adminDashboard = dashboardService.admin(admin.principal());
        assertThat(adminDashboard.paymentStates().paid()).isEqualTo(1);
        assertThat(adminDashboard.verifiedRevenue()).isEqualByComparingTo("3540.00");
        DomainDtos.PortalDashboardResponse clientDashboard = dashboardService.client(client.principal());
        assertThat(clientDashboard.paidTotal()).isEqualByComparingTo("3540.00");
        assertThat(clientDashboard.outstandingTotal()).isEqualByComparingTo("12000.00");
        assertThat(adminDashboard.recentContactMessages())
                .extracting(DomainDtos.AdminContactMessageResponse::subject)
                .contains("Order support");
    }

    private Identity identity(String name, String email, UserRole role) {
        UUID supabaseId = UUID.randomUUID();
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setRole(role);
        user.setSupabaseUserId(supabaseId);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user = userRepository.saveAndFlush(user);
        return new Identity(user, new SupabaseUserPrincipal(supabaseId, email, name, role));
    }

    private ServiceOffering service(String name, BigDecimal price) {
        ServiceOffering service = new ServiceOffering();
        service.setName(name);
        service.setDescription("Persisted service used by the workflow test");
        service.setCategory("VIDEO");
        service.setBasePrice(price);
        service.setCurrency("INR");
        service.setRequiredClientInformation("[]");
        service.setActive(true);
        return serviceRepository.saveAndFlush(service);
    }

    private static MockMultipartFile png(String name) {
        return new MockMultipartFile("file", name, "image/png",
                new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1});
    }

    private record Identity(User user, SupabaseUserPrincipal principal) {}

    @TestConfiguration
    static class StorageConfiguration {
        @Bean
        @Primary
        OrderFileStorageService orderFileStorageService() {
            return new OrderFileStorageService() {
                @Override
                public String upload(UUID orderId, UUID fileId, FileCategory category, ValidatedOrderFile file) {
                    return "orders/" + orderId + "/test/" + fileId + "-" + file.safeFilename();
                }

                @Override public String createSignedUrl(String objectPath) { return "https://storage.test/" + objectPath; }
                @Override public void delete(String objectPath) { }
                @Override public String bucket() { return "test-order-files"; }
                @Override public long signedUrlTtlSeconds() { return 60; }
            };
        }
    }
}
