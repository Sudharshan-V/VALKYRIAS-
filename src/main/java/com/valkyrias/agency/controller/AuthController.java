package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.auth.AdminUserSummary;
import com.valkyrias.agency.dto.auth.AuthenticatedUserSummary;
import com.valkyrias.agency.dto.auth.RegistrationRequest;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.UserRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    /**
     * Endpoint to handle User Login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required."));
        }

        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email.trim());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getPassword() != null && user.getPassword().equals(password)) {
                return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "user", safeAuthUser(user)
                ));
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Invalid email or password."));
    }

    /**
     * Endpoint to handle User Registration
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegistrationRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase(java.util.Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            return ResponseEntity.badRequest().body(Map.of("message", "User with this email already exists."));
        }

        // Construct a fresh entity so IDs, roles, and profile fields cannot be
        // mass-assigned through the public registration endpoint.
        User newUser = new User();
        newUser.setEmail(normalizedEmail);
        newUser.setName(request.name().trim());
        newUser.setPassword(request.password());
        newUser.setRole("client");

        User savedUser = userRepository.save(newUser);
        return ResponseEntity.ok(Map.of(
            "status", "success",
            "user", safeAuthUser(savedUser)
        ));
    }

    /**
     * Endpoint to list all users (for Admin Portal)
     */
    @GetMapping("/users")
    public ResponseEntity<List<AdminUserSummary>> getAllUsers(
            @AuthenticationPrincipal SupabaseUserPrincipal principal
    ) {
        if (principal == null || resolveRole(principal) != UserRole.ADMIN) {
            throw new AccessDeniedException("Administrator access is required");
        }
        List<AdminUserSummary> users = userRepository.findAll().stream()
                .map(user -> new AdminUserSummary(
                        user.getEmail(),
                        safeRole(user),
                        user.getDisplayName(),
                        user.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(users);
    }

    private UserRole resolveRole(SupabaseUserPrincipal principal) {
        Optional<User> localUser = userRepository.findBySupabaseUserId(principal.userId())
                .or(() -> userRepository.findByEmailIgnoreCase(principal.email()));
        return localUser.map(AuthController::safeRole)
                .orElse(principal.trustedRole() == null ? UserRole.CLIENT : principal.trustedRole());
    }

    private static UserRole safeRole(User user) {
        try {
            return user.getUserRole();
        } catch (IllegalArgumentException exception) {
            return UserRole.CLIENT;
        }
    }

    private static AuthenticatedUserSummary safeAuthUser(User user) {
        return new AuthenticatedUserSummary(user.getFullName(), user.getEmail(), safeRole(user));
    }
}
