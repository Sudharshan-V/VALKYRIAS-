package com.valkyrias.agency.service;

import com.valkyrias.agency.model.Plan;
import com.valkyrias.agency.repository.PlanRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PlanService {

    private final PlanRepository planRepository;

    public PlanService(PlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    public List<Plan> getPlansByUserId(UUID userId) {
        return planRepository.findByUserId(userId);
    }

    public Plan savePlan(Plan plan) {
        return planRepository.save(plan);
    }

    public boolean deletePlan(String id) {
        if (planRepository.existsById(id)) {
            planRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
