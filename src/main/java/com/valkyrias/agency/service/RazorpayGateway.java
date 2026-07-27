package com.valkyrias.agency.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.valkyrias.agency.exception.DomainValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

@Service
public class RazorpayGateway {
    private final RestClient client;
    private final String keyId;
    private final String keySecret;

    public RazorpayGateway(
            RestClient.Builder builder,
            @Value("${razorpay.key-id:}") String keyId,
            @Value("${razorpay.key-secret:}") String keySecret
    ) {
        this.client = builder.baseUrl("https://api.razorpay.com/v1").build();
        this.keyId = keyId.trim();
        this.keySecret = keySecret.trim();
    }

    public String publicKey() {
        requireConfigured();
        return keyId;
    }

    public String createOrder(BigDecimal amount, String currency, String receipt) {
        requireConfigured();
        try {
            JsonNode response = client.post()
                    .uri("/orders")
                    .headers(headers -> headers.setBasicAuth(keyId, keySecret))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "amount", amount.movePointRight(2).longValueExact(),
                            "currency", currency,
                            "receipt", receipt
                    ))
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null || response.path("id").asText().isBlank()) {
                throw new DomainValidationException("Razorpay did not return a checkout order.");
            }
            return response.path("id").asText();
        } catch (RestClientResponseException exception) {
            throw new DomainValidationException("Razorpay order creation failed. Check the configured credentials and amount.");
        } catch (ArithmeticException exception) {
            throw new DomainValidationException("The payment amount has unsupported precision.");
        }
    }

    public boolean hasValidSignature(String orderId, String paymentId, String signature) {
        requireConfigured();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = HexFormat.of().formatHex(
                    mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8)));
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.US_ASCII),
                    signature.getBytes(StandardCharsets.US_ASCII));
        } catch (Exception exception) {
            throw new IllegalStateException("Razorpay signature verification could not be performed.", exception);
        }
    }

    private void requireConfigured() {
        if (keyId.isBlank() || keySecret.isBlank()) {
            throw new DomainValidationException(
                    "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the backend.");
        }
    }
}
