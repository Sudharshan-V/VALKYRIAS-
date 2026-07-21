package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.Deliverable;
import com.valkyrias.agency.service.DeliverableService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/deliverables")
@CrossOrigin(origins = "*")
public class DeliverableController {

    private final DeliverableService deliverableService;

    public DeliverableController(DeliverableService deliverableService) {
        this.deliverableService = deliverableService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Deliverable>> getDeliverablesByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(deliverableService.getDeliverablesByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<Deliverable> saveDeliverable(@RequestBody Deliverable deliverable) {
        return ResponseEntity.ok(deliverableService.saveDeliverable(deliverable));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeliverable(@PathVariable String id) {
        if (deliverableService.deleteDeliverable(id)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
