package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.ChatMessage;
import com.valkyrias.agency.repository.ChatMessageRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.CurrentUserService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat-messages")
public class ChatMessageController {

    private final ChatMessageRepository chatMessageRepository;
    private final CurrentUserService currentUserService;

    public ChatMessageController(ChatMessageRepository chatMessageRepository, CurrentUserService currentUserService) {
        this.chatMessageRepository = chatMessageRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<ChatMessage>> getChatMessagesByUser(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return ResponseEntity.ok(chatMessageRepository.findByUserId(currentUserService.require(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<ChatMessage> saveChatMessage(@AuthenticationPrincipal SupabaseUserPrincipal principal, @RequestBody ChatMessage chatMessage) {
        chatMessage.setId(UUID.randomUUID().toString());
        chatMessage.setUserId(currentUserService.require(principal).getId());
        return ResponseEntity.ok(chatMessageRepository.save(chatMessage));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChatMessage(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable String id) {
        ChatMessage item = chatMessageRepository.findById(id).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        if (!currentUserService.require(principal).getId().equals(item.getUserId())) throw new AccessDeniedException("You do not own this legacy message");
        chatMessageRepository.delete(item);
        return ResponseEntity.noContent().build();
    }
}
