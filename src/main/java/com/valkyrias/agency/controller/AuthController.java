package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.auth.AdminUserSummary;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.UserRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.CurrentUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public AuthController(UserRepository userRepository, CurrentUserService currentUserService) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
    }

    /**
     * Endpoint to list all users (for Admin Portal)
     */
    @GetMapping("/users")
    public ResponseEntity<List<AdminUserSummary>> getAllUsers(
            @AuthenticationPrincipal SupabaseUserPrincipal principal
    ) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        List<AdminUserSummary> users = userRepository.findAll().stream()
                .map(user -> new AdminUserSummary(
                        user.getEmail(),
                        safeRole(user),
                        user.getDisplayName(),
                        user.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(users);
    }

    private static UserRole safeRole(User user) {
        if (user.getRole() == null) {
            throw new AccessDeniedException("Account role is not supported");
        }
        return user.getRole();
    }
}
