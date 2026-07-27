package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.exception.DomainValidationException;
import com.valkyrias.agency.exception.ResourceNotFoundException;
import com.valkyrias.agency.model.*;
import com.valkyrias.agency.repository.OrderEventRepository;
import com.valkyrias.agency.repository.PaymentRepository;
import com.valkyrias.agency.repository.ProjectOrderRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final ProjectOrderRepository orderRepository;
    private final OrderEventRepository eventRepository;
    private final OrderService orderService;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final DomainMapper mapper;
    private final RazorpayGateway razorpayGateway;
    private final CouponService couponService;
    private static final BigDecimal DEPOSIT_RATE = new BigDecimal("0.20");
    private static final BigDecimal GST_RATE = new BigDecimal("0.18");

    public PaymentService(
            PaymentRepository paymentRepository,
            ProjectOrderRepository orderRepository,
            OrderEventRepository eventRepository,
            OrderService orderService,
            CurrentUserService currentUserService,
            NotificationService notificationService,
            DomainMapper mapper,
            RazorpayGateway razorpayGateway,
            CouponService couponService
    ) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.eventRepository = eventRepository;
        this.orderService = orderService;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.mapper = mapper;
        this.razorpayGateway = razorpayGateway;
        this.couponService = couponService;
    }

    @Transactional(readOnly = true)
    public DomainDtos.PaymentQuoteResponse quote(
            SupabaseUserPrincipal principal,
            UUID orderId,
            DomainDtos.PaymentQuoteRequest request
    ) {
        User client = currentUserService.requireRole(principal, UserRole.CLIENT);
        ProjectOrder order = requirePayableOrder(orderId, client);
        return pricing(order, request.couponCode()).response(order.getId(), order.getCurrency());
    }

    @Transactional(readOnly = true)
    public List<DomainDtos.PaymentResponse> list(SupabaseUserPrincipal principal, UUID orderId) {
        User user = currentUserService.require(principal);
        ProjectOrder order = orderService.requireAccessible(orderId, user);
        if (user.getRole() == UserRole.EDITOR) {
            throw new AccessDeniedException("Editors cannot access client payment records");
        }
        return paymentRepository.findByOrderIdOrderByCreatedAtDesc(order.getId()).stream().map(mapper::payment).toList();
    }

    @Transactional
    public DomainDtos.PaymentResponse initiate(
            SupabaseUserPrincipal principal,
            UUID orderId,
            DomainDtos.CreatePaymentRequest request
    ) {
        User client = currentUserService.requireRole(principal, UserRole.CLIENT);
        ProjectOrder order = requirePayableOrder(orderId, client);
        Pricing pricing = pricing(order, request.couponCode());
        boolean razorpay = "RAZORPAY".equalsIgnoreCase(request.provider().trim());
        var existing = paymentRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(orderId, PaymentStatus.PENDING);
        if (existing.isPresent() && matches(existing.get(), pricing, razorpay)) {
            DomainDtos.PaymentResponse response = mapper.payment(existing.get());
            return razorpay ? withCheckoutKey(response) : response;
        }

        existing.ifPresent(stale -> {
            stale.setStatus(PaymentStatus.CANCELLED);
            paymentRepository.save(stale);
        });
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setClient(client);
        payment.setAmount(pricing.totalAmount());
        payment.setOrderAmount(pricing.orderAmount());
        payment.setDepositAmount(pricing.depositAmount());
        payment.setDiscountAmount(pricing.discountAmount());
        payment.setGstAmount(pricing.gstAmount());
        payment.setCouponCode(pricing.couponCode());
        payment.setCurrency(order.getCurrency());
        payment.setProvider(razorpay ? "RAZORPAY" : request.provider().trim());
        if (razorpay) {
            payment.setProviderOrderId(razorpayGateway.createOrder(
                    pricing.totalAmount(), order.getCurrency(), razorpayReceipt(order.getId())));
        }
        payment = paymentRepository.saveAndFlush(payment);
        OrderStatus previous = order.getStatus();
        if (order.getStatus() == OrderStatus.APPROVED) {
            order.setStatus(OrderStatus.PAYMENT_PENDING);
            orderRepository.save(order);
        }
        event(order, client, "PAYMENT_INITIATED", previous, order.getStatus());
        DomainDtos.PaymentResponse response = mapper.payment(payment);
        return razorpay ? withCheckoutKey(response) : response;
    }

    @Transactional
    public DomainDtos.PaymentResponse verifyRazorpay(
            SupabaseUserPrincipal principal,
            UUID paymentId,
            DomainDtos.RazorpayVerificationRequest request
    ) {
        User client = currentUserService.requireRole(principal, UserRole.CLIENT);
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        if (!payment.getClient().getId().equals(client.getId())) {
            throw new AccessDeniedException("You do not own this payment");
        }
        if (payment.getStatus() == PaymentStatus.PAID) return mapper.payment(payment);
        if (!"RAZORPAY".equals(payment.getProvider())
                || !request.razorpayOrderId().equals(payment.getProviderOrderId())) {
            throw new DomainValidationException("The Razorpay order does not match this payment.");
        }
        if (!razorpayGateway.hasValidSignature(
                request.razorpayOrderId(), request.razorpayPaymentId(), request.razorpaySignature())) {
            throw new DomainValidationException("Razorpay payment signature verification failed.");
        }

        payment.setProviderPaymentId(request.razorpayPaymentId());
        payment.setVerificationResult("RAZORPAY_SIGNATURE_VERIFIED");
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(OffsetDateTime.now());
        ProjectOrder order = payment.getOrder();
        OrderStatus previous = order.getStatus();
        order.setStatus(OrderStatus.PAID);
        orderRepository.save(order);
        event(order, client, "PAYMENT_VERIFIED", previous, OrderStatus.PAID);
        notificationService.create(client, "PAYMENT_COMPLETED", "Payment verified",
                "Payment for " + order.getTitle() + " was verified by Razorpay.", "ORDER", order.getId());
        if (order.getAssignedEditor() != null) {
            notificationService.create(order.getAssignedEditor(), "PAYMENT_COMPLETED", "Payment verified",
                    "The order is ready for final delivery.", "ORDER", order.getId());
        }
        return mapper.payment(paymentRepository.save(payment));
    }

    private DomainDtos.PaymentResponse withCheckoutKey(DomainDtos.PaymentResponse response) {
        return new DomainDtos.PaymentResponse(
                response.id(), response.orderId(), response.amount(), response.orderAmount(),
                response.depositAmount(), response.discountAmount(), response.gstAmount(),
                response.couponCode(), response.currency(),
                response.provider(), response.providerOrderId(), response.providerPaymentId(),
                response.status(), response.createdAt(), response.paidAt(), razorpayGateway.publicKey());
    }

    private ProjectOrder requirePayableOrder(UUID orderId, User client) {
        ProjectOrder order = orderService.requireOrder(orderId);
        if (!order.getClient().getId().equals(client.getId())) {
            throw new AccessDeniedException("You do not own this order");
        }
        if (order.getStatus() != OrderStatus.APPROVED && order.getStatus() != OrderStatus.PAYMENT_PENDING) {
            throw new DomainValidationException("Payment is not available while order status is " + order.getStatus());
        }
        if (order.getBudget() == null || order.getBudget().signum() <= 0) {
            throw new DomainValidationException("The order has no payable amount");
        }
        return order;
    }

    private Pricing pricing(ProjectOrder order, String rawCouponCode) {
        BigDecimal orderAmount = money(order.getBudget());
        BigDecimal depositAmount = money(orderAmount.multiply(DEPOSIT_RATE));
        BigDecimal discountPercent = BigDecimal.ZERO.setScale(2);
        String couponCode = null;
        if (rawCouponCode != null && !rawCouponCode.isBlank()) {
            Coupon coupon = couponService.requireRedeemable(rawCouponCode);
            discountPercent = coupon.getDiscountPercent();
            couponCode = coupon.getCode();
        }
        BigDecimal discountAmount = money(depositAmount
                .multiply(discountPercent)
                .divide(new BigDecimal("100"), 6, RoundingMode.HALF_UP));
        BigDecimal taxableAmount = depositAmount.subtract(discountAmount);
        BigDecimal gstAmount = money(taxableAmount.multiply(GST_RATE));
        BigDecimal totalAmount = money(taxableAmount.add(gstAmount));
        if (totalAmount.signum() <= 0) {
            throw new DomainValidationException("This coupon reduces the payable amount below Razorpay's minimum.");
        }
        return new Pricing(orderAmount, depositAmount, discountAmount, discountPercent,
                gstAmount, totalAmount, couponCode);
    }

    private boolean matches(Payment payment, Pricing pricing, boolean razorpay) {
        boolean providerMatches = razorpay
                ? "RAZORPAY".equals(payment.getProvider()) && payment.getProviderOrderId() != null
                : !"RAZORPAY".equals(payment.getProvider());
        return providerMatches
                && same(payment.getAmount(), pricing.totalAmount())
                && normalize(payment.getCouponCode()).equals(normalize(pricing.couponCode()));
    }

    private boolean same(BigDecimal left, BigDecimal right) {
        return left != null && left.compareTo(right) == 0;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Razorpay limits receipts to 40 characters and treats them as unique
     * idempotency keys. Keep both an order fragment and a fresh attempt
     * fragment so a replaced pending order can be created safely.
     */
    static String razorpayReceipt(UUID orderId) {
        String orderPart = orderId.toString().replace("-", "").substring(0, 20);
        String attemptPart = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        return "ord_" + orderPart + "_" + attemptPart;
    }

    private record Pricing(
            BigDecimal orderAmount,
            BigDecimal depositAmount,
            BigDecimal discountAmount,
            BigDecimal discountPercent,
            BigDecimal gstAmount,
            BigDecimal totalAmount,
            String couponCode
    ) {
        DomainDtos.PaymentQuoteResponse response(UUID orderId, String currency) {
            return new DomainDtos.PaymentQuoteResponse(
                    orderId, orderAmount, depositAmount, discountAmount, discountPercent,
                    gstAmount, totalAmount, currency, couponCode);
        }
    }

    /**
     * Records a verification completed outside the browser. This endpoint is
     * ADMIN-only and preserves the verification reference for audit. A real
     * provider webhook adapter can call the same service after signature
     * validation; React can never mark a payment paid.
     */
    @Transactional
    public DomainDtos.PaymentResponse recordVerified(
            SupabaseUserPrincipal principal,
            UUID paymentId,
            DomainDtos.VerifyPaymentRequest request
    ) {
        User admin = currentUserService.requireRole(principal, UserRole.ADMIN);
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        if (payment.getStatus() == PaymentStatus.PAID) return mapper.payment(payment);
        if (payment.getStatus() != PaymentStatus.PENDING && payment.getStatus() != PaymentStatus.REQUIRES_ACTION) {
            throw new DomainValidationException("This payment cannot be verified from status " + payment.getStatus());
        }
        payment.setProviderPaymentId(request.providerPaymentId().trim());
        payment.setVerificationResult(request.verificationReference().trim());
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(OffsetDateTime.now());
        ProjectOrder order = payment.getOrder();
        OrderStatus previous = order.getStatus();
        order.setStatus(OrderStatus.PAID);
        orderRepository.save(order);
        event(order, admin, "PAYMENT_VERIFIED", previous, OrderStatus.PAID);
        notificationService.create(order.getClient(), "PAYMENT_COMPLETED", "Payment verified",
                "Payment for " + order.getTitle() + " was verified.", "ORDER", order.getId());
        if (order.getAssignedEditor() != null) {
            notificationService.create(order.getAssignedEditor(), "PAYMENT_COMPLETED", "Payment verified",
                    "The order is ready for final delivery.", "ORDER", order.getId());
        }
        return mapper.payment(paymentRepository.save(payment));
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
}
