package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.PortfolioItem;
import com.valkyrias.agency.service.PortfolioItemService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/portfolio-items")
@CrossOrigin(origins = "*")
public class PortfolioItemController {

    private final PortfolioItemService portfolioItemService;

    public PortfolioItemController(PortfolioItemService portfolioItemService) {
        this.portfolioItemService = portfolioItemService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PortfolioItem>> getPortfolioItemsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(portfolioItemService.getPortfolioItemsByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<PortfolioItem> savePortfolioItem(@RequestBody PortfolioItem portfolioItem) {
        return ResponseEntity.ok(portfolioItemService.savePortfolioItem(portfolioItem));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePortfolioItem(@PathVariable String id) {
        if (portfolioItemService.deletePortfolioItem(id)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
