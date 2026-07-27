package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.Plan;
import com.valkyrias.agency.repository.PlanRepository;
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
@RequestMapping("/api/plans")
public class PlanController {

    private final PlanRepository planRepository;
    private final CurrentUserService currentUserService;

    public PlanController(PlanRepository planRepository, CurrentUserService currentUserService) {
        this.planRepository = planRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<Plan>> getPlansByUser(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return ResponseEntity.ok(planRepository.findByUserId(currentUserService.require(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<Plan> savePlan(@AuthenticationPrincipal SupabaseUserPrincipal principal, @RequestBody Plan plan) {
        plan.setId(UUID.randomUUID().toString());
        plan.setUserId(currentUserService.require(principal).getId());
        return ResponseEntity.ok(planRepository.save(plan));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable String id) {
        Plan item = planRepository.findById(id).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        if (!currentUserService.require(principal).getId().equals(item.getUserId())) throw new AccessDeniedException("You do not own this legacy plan");
        planRepository.delete(item);
        return ResponseEntity.noContent().build();
    }
}
