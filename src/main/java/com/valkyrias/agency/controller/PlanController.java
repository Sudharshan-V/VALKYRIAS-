package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.Plan;
import com.valkyrias.agency.repository.PlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/plans")
@CrossOrigin(origins = "*")
public class PlanController {

    @Autowired
    private PlanRepository planRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Plan>> getPlansByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(planRepository.findByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<Plan> savePlan(@RequestBody Plan plan) {
        return ResponseEntity.ok(planRepository.save(plan));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable String id) {
        if (planRepository.existsById(id)) {
            planRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
