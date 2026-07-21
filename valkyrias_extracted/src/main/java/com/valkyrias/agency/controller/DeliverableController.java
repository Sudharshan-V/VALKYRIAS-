package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.Deliverable;
import com.valkyrias.agency.repository.DeliverableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/deliverables")
@CrossOrigin(origins = "*")
public class DeliverableController {

    @Autowired
    private DeliverableRepository deliverableRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Deliverable>> getDeliverablesByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(deliverableRepository.findByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<Deliverable> saveDeliverable(@RequestBody Deliverable deliverable) {
        return ResponseEntity.ok(deliverableRepository.save(deliverable));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeliverable(@PathVariable String id) {
        if (deliverableRepository.existsById(id)) {
            deliverableRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
