package com.valkyrias.agency.service;

import com.valkyrias.agency.model.ActionItem;
import com.valkyrias.agency.repository.ActionItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ActionItemService {

    private final ActionItemRepository actionItemRepository;

    public ActionItemService(ActionItemRepository actionItemRepository) {
        this.actionItemRepository = actionItemRepository;
    }

    public List<ActionItem> getActionItemsByUserId(UUID userId) {
        return actionItemRepository.findByUserId(userId);
    }

    public ActionItem saveActionItem(ActionItem actionItem) {
        return actionItemRepository.save(actionItem);
    }

    public boolean deleteActionItem(String id) {
        if (actionItemRepository.existsById(id)) {
            actionItemRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
