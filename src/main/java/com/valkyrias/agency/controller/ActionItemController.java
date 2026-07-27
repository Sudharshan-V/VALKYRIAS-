package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.ActionItem;
import com.valkyrias.agency.repository.ActionItemRepository;
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
@RequestMapping("/api/action-items")
public class ActionItemController {

    private final ActionItemRepository actionItemRepository;
    private final CurrentUserService currentUserService;

    public ActionItemController(ActionItemRepository actionItemRepository, CurrentUserService currentUserService) {
        this.actionItemRepository = actionItemRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<ActionItem>> getActionItemsByUser(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return ResponseEntity.ok(actionItemRepository.findByUserId(currentUserService.require(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<ActionItem> saveActionItem(@AuthenticationPrincipal SupabaseUserPrincipal principal, @RequestBody ActionItem actionItem) {
        actionItem.setId(UUID.randomUUID().toString());
        actionItem.setUserId(currentUserService.require(principal).getId());
        return ResponseEntity.ok(actionItemRepository.save(actionItem));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActionItem(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable String id) {
        ActionItem item = actionItemRepository.findById(id).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        if (!currentUserService.require(principal).getId().equals(item.getUserId())) throw new AccessDeniedException("You do not own this action item");
        actionItemRepository.delete(item);
        return ResponseEntity.noContent().build();
    }
}
