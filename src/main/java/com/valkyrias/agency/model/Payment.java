package com.valkyrias.agency.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private ProjectOrder order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "order_amount", precision = 19, scale = 2)
    private BigDecimal orderAmount;

    @Column(name = "deposit_amount", precision = 19, scale = 2)
    private BigDecimal depositAmount;

    @Column(name = "discount_amount", precision = 19, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "gst_amount", precision = 19, scale = 2)
    private BigDecimal gstAmount;

    @Column(name = "coupon_code", length = 32)
    private String couponCode;

    @Column(nullable = false, length = 3)
    private String currency = "INR";

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "provider_order_id", length = 255)
    private String providerOrderId;

    @Column(name = "provider_payment_id", length = 255)
    private String providerPaymentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "verification_result", length = 2000)
    private String verificationResult;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @PrePersist
    void createTimestamp() { createdAt = createdAt == null ? OffsetDateTime.now() : createdAt; }
}
