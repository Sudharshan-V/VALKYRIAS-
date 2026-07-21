package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.Plan;
import com.valkyrias.agency.service.PlanService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/plans")
@CrossOrigin(origins = "*")
public class PlanController {

    private final PlanService planService;

    public PlanController(PlanService planService) {
        this.planService = planService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Plan>> getPlansByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(planService.getPlansByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<Plan> savePlan(@RequestBody Plan plan) {
        return ResponseEntity.ok(planService.savePlan(plan));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable String id) {
        if (planService.deletePlan(id)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
