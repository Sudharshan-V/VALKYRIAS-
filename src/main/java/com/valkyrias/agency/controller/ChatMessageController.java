package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.ChatMessage;
import com.valkyrias.agency.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat-messages")
@CrossOrigin(origins = "*")
public class ChatMessageController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ChatMessage>> getChatMessagesByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(chatMessageRepository.findByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<ChatMessage> saveChatMessage(@RequestBody ChatMessage chatMessage) {
        return ResponseEntity.ok(chatMessageRepository.save(chatMessage));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChatMessage(@PathVariable String id) {
        if (chatMessageRepository.existsById(id)) {
            chatMessageRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
