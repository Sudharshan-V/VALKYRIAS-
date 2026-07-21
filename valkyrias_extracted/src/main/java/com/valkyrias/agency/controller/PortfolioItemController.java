package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.PortfolioItem;
import com.valkyrias.agency.repository.PortfolioItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/portfolio-items")
@CrossOrigin(origins = "*")
public class PortfolioItemController {

    @Autowired
    private PortfolioItemRepository portfolioItemRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PortfolioItem>> getPortfolioItemsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(portfolioItemRepository.findByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<PortfolioItem> savePortfolioItem(@RequestBody PortfolioItem portfolioItem) {
        return ResponseEntity.ok(portfolioItemRepository.save(portfolioItem));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePortfolioItem(@PathVariable String id) {
        if (portfolioItemRepository.existsById(id)) {
            portfolioItemRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
