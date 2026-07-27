package com.valkyrias.agency.controller;

import com.valkyrias.agency.exception.DomainValidationException;
import com.valkyrias.agency.model.PortfolioItem;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.PortfolioItemRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.CurrentUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/portfolio-items")
public class PortfolioItemController {
    private static final int MAX_IMAGE_LENGTH = 3_600_000;
    private static final Pattern IMAGE_SOURCE = Pattern.compile(
            "^(https?://.+|data:image/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+)$",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL
    );

    private final PortfolioItemRepository portfolioItemRepository;
    private final CurrentUserService currentUserService;

    public PortfolioItemController(PortfolioItemRepository portfolioItemRepository, CurrentUserService currentUserService) {
        this.portfolioItemRepository = portfolioItemRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/public")
    public ResponseEntity<List<PortfolioItem>> getPublishedPortfolio() {
        return ResponseEntity.ok(portfolioItemRepository.findByPublishedTrueOrderByCreatedAtDesc());
    }

    @GetMapping
    public ResponseEntity<List<PortfolioItem>> getPortfolioItemsByUser(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return ResponseEntity.ok(portfolioItemRepository.findByUserId(currentUserService.require(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<PortfolioItem> savePortfolioItem(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody PortfolioItem portfolioItem
    ) {
        User owner = currentUserService.requireRole(principal, UserRole.ADMIN, UserRole.EDITOR);
        portfolioItem.setId(UUID.randomUUID().toString());
        portfolioItem.setUserId(owner.getId());
        portfolioItem.setTitle(required(portfolioItem.getTitle(), "Portfolio title", 255));
        portfolioItem.setCategory(required(portfolioItem.getCategory(), "Portfolio category", 255));
        portfolioItem.setDescription(optional(portfolioItem.getDescription(), 10_000));
        portfolioItem.setSoftware(optional(portfolioItem.getSoftware(), 255));
        portfolioItem.setClientName(optional(portfolioItem.getClientName(), 255));
        portfolioItem.setDuration(optional(portfolioItem.getDuration(), 255));

        String image = required(portfolioItem.getImage(), "Portfolio image", MAX_IMAGE_LENGTH);
        if (!IMAGE_SOURCE.matcher(image).matches()) {
            throw new DomainValidationException("Portfolio image must be an HTTPS image URL or a supported local image upload");
        }
        portfolioItem.setImage(image);
        portfolioItem.setPublished(owner.getRole() == UserRole.ADMIN && portfolioItem.isPublished());
        return ResponseEntity.ok(portfolioItemRepository.save(portfolioItem));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePortfolioItem(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable String id
    ) {
        PortfolioItem item = portfolioItemRepository.findById(id).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        User actor = currentUserService.require(principal);
        if (actor.getRole() != UserRole.ADMIN && !actor.getId().equals(item.getUserId())) {
            throw new AccessDeniedException("You do not own this portfolio item");
        }
        portfolioItemRepository.delete(item);
        return ResponseEntity.noContent().build();
    }

    private static String required(String value, String label, int maxLength) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.isEmpty()) throw new DomainValidationException(label + " is required");
        if (cleaned.length() > maxLength) throw new DomainValidationException(label + " is too long");
        return cleaned;
    }

    private static String optional(String value, int maxLength) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.length() > maxLength) throw new DomainValidationException("Portfolio detail is too long");
        return cleaned;
    }
}
