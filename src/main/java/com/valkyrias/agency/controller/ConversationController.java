package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.ConversationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
public class ConversationController {
    private final ConversationService service;

    public ConversationController(ConversationService service) { this.service = service; }

    @GetMapping("/api/orders/{orderId}/conversation")
    public DomainDtos.ConversationResponse forOrder(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId
    ) { return service.forOrder(principal, orderId); }

    @GetMapping("/api/conversations/{conversationId}/messages")
    public DomainDtos.PageResponse<DomainDtos.MessageResponse> messages(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) { return service.messages(principal, conversationId, page, size); }

    @PostMapping("/api/conversations/{conversationId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public DomainDtos.MessageResponse send(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID conversationId,
            @Valid @RequestBody DomainDtos.SendMessageRequest request
    ) { return service.send(principal, conversationId, request); }

    @PostMapping("/api/conversations/{conversationId}/read")
    public Map<String, Long> markRead(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID conversationId
    ) { return Map.of("unreadCount", service.markRead(principal, conversationId)); }
}
