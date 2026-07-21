package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.ActionItem;
import com.valkyrias.agency.repository.ActionItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/action-items")
@CrossOrigin(origins = "*")
public class ActionItemController {

    @Autowired
    private ActionItemRepository actionItemRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ActionItem>> getActionItemsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(actionItemRepository.findByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<ActionItem> saveActionItem(@RequestBody ActionItem actionItem) {
        return ResponseEntity.ok(actionItemRepository.save(actionItem));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActionItem(@PathVariable String id) {
        if (actionItemRepository.existsById(id)) {
            actionItemRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
