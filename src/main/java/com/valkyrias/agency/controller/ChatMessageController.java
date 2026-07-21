package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.ChatMessage;
import com.valkyrias.agency.service.ChatMessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat-messages")
@CrossOrigin(origins = "*")
public class ChatMessageController {

    private final ChatMessageService chatMessageService;

    public ChatMessageController(ChatMessageService chatMessageService) {
        this.chatMessageService = chatMessageService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ChatMessage>> getChatMessagesByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(chatMessageService.getChatMessagesByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<ChatMessage> saveChatMessage(@RequestBody ChatMessage chatMessage) {
        return ResponseEntity.ok(chatMessageService.saveChatMessage(chatMessage));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChatMessage(@PathVariable String id) {
        if (chatMessageService.deleteChatMessage(id)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
