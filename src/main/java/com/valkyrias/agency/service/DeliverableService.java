package com.valkyrias.agency.service;

import com.valkyrias.agency.model.Deliverable;
import com.valkyrias.agency.repository.DeliverableRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class DeliverableService {

    private final DeliverableRepository deliverableRepository;

    public DeliverableService(DeliverableRepository deliverableRepository) {
        this.deliverableRepository = deliverableRepository;
    }

    public List<Deliverable> getDeliverablesByUserId(UUID userId) {
        return deliverableRepository.findByUserId(userId);
    }

    public Deliverable saveDeliverable(Deliverable deliverable) {
        return deliverableRepository.save(deliverable);
    }

    public boolean deleteDeliverable(String id) {
        if (deliverableRepository.existsById(id)) {
            deliverableRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
