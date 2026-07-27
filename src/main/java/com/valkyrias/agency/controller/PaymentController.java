package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class PaymentController {
    private final PaymentService service;

    public PaymentController(PaymentService service) { this.service = service; }

    @GetMapping("/api/orders/{orderId}/payments")
    public List<DomainDtos.PaymentResponse> list(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId
    ) { return service.list(principal, orderId); }

    @PostMapping("/api/orders/{orderId}/payment-quote")
    public DomainDtos.PaymentQuoteResponse quote(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId,
            @Valid @RequestBody DomainDtos.PaymentQuoteRequest request
    ) { return service.quote(principal, orderId, request); }

    @PostMapping("/api/orders/{orderId}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public DomainDtos.PaymentResponse initiate(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId,
            @Valid @RequestBody DomainDtos.CreatePaymentRequest request
    ) { return service.initiate(principal, orderId, request); }

    @PostMapping("/api/payments/{paymentId}/razorpay/verify")
    public DomainDtos.PaymentResponse verifyRazorpay(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID paymentId,
            @Valid @RequestBody DomainDtos.RazorpayVerificationRequest request
    ) { return service.verifyRazorpay(principal, paymentId, request); }

    @PostMapping("/api/admin/payments/{paymentId}/verify")
    public DomainDtos.PaymentResponse verify(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID paymentId,
            @Valid @RequestBody DomainDtos.VerifyPaymentRequest request
    ) { return service.recordVerified(principal, paymentId, request); }
}
