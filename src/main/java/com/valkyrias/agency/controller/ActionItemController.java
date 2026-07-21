package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.ActionItem;
import com.valkyrias.agency.service.ActionItemService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/action-items")
@CrossOrigin(origins = "*")
public class ActionItemController {

    private final ActionItemService actionItemService;

    public ActionItemController(ActionItemService actionItemService) {
        this.actionItemService = actionItemService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ActionItem>> getActionItemsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(actionItemService.getActionItemsByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<ActionItem> saveActionItem(@RequestBody ActionItem actionItem) {
        return ResponseEntity.ok(actionItemService.saveActionItem(actionItem));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActionItem(@PathVariable String id) {
        if (actionItemService.deleteActionItem(id)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
