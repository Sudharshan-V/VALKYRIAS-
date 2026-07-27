package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.Deliverable;
import com.valkyrias.agency.repository.DeliverableRepository;
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
@RequestMapping("/api/deliverables")
public class DeliverableController {

    private final DeliverableRepository deliverableRepository;
    private final CurrentUserService currentUserService;

    public DeliverableController(DeliverableRepository deliverableRepository, CurrentUserService currentUserService) {
        this.deliverableRepository = deliverableRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<Deliverable>> getDeliverablesByUser(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return ResponseEntity.ok(deliverableRepository.findByUserId(currentUserService.require(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<Deliverable> saveDeliverable(@AuthenticationPrincipal SupabaseUserPrincipal principal, @RequestBody Deliverable deliverable) {
        deliverable.setId(UUID.randomUUID().toString());
        deliverable.setUserId(currentUserService.require(principal).getId());
        return ResponseEntity.ok(deliverableRepository.save(deliverable));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeliverable(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable String id) {
        Deliverable item = deliverableRepository.findById(id).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        if (!currentUserService.require(principal).getId().equals(item.getUserId())) throw new AccessDeniedException("You do not own this legacy deliverable");
        deliverableRepository.delete(item);
        return ResponseEntity.noContent().build();
    }
}
