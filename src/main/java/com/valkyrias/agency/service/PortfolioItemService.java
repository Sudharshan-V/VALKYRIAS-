package com.valkyrias.agency.service;

import com.valkyrias.agency.model.PortfolioItem;
import com.valkyrias.agency.repository.PortfolioItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PortfolioItemService {

    private final PortfolioItemRepository portfolioItemRepository;

    public PortfolioItemService(PortfolioItemRepository portfolioItemRepository) {
        this.portfolioItemRepository = portfolioItemRepository;
    }

    public List<PortfolioItem> getPortfolioItemsByUserId(UUID userId) {
        return portfolioItemRepository.findByUserId(userId);
    }

    public PortfolioItem savePortfolioItem(PortfolioItem portfolioItem) {
        return portfolioItemRepository.save(portfolioItem);
    }

    public boolean deletePortfolioItem(String id) {
        if (portfolioItemRepository.existsById(id)) {
            portfolioItemRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
