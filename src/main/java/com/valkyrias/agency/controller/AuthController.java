package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.*;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Endpoint to handle User Login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required."));
        }

        return userService.login(request)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Invalid email or password.")));
    }

    /**
     * Endpoint to handle User Registration
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request.getEmail() == null || request.getPassword() == null || request.getName() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Name, email and password are required."));
        }

        return userService.register(request)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.badRequest()
                        .body(Map.of("message", "User with this email already exists.")));
    }

    /**
     * Endpoint to handle Forgot Password
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        if (request.getEmail() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }
        boolean exists = userService.forgotPassword(request);
        if (exists) {
            return ResponseEntity.ok(Map.of("status", "success", "message", "Password reset instructions sent."));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Email not found."));
        }
    }

    /**
     * Endpoint to handle Reset Password
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        if (request.getEmail() == null || request.getNewPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and new password are required."));
        }
        boolean success = userService.resetPassword(request);
        if (success) {
            return ResponseEntity.ok(Map.of("status", "success", "message", "Password has been reset successfully."));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Email not found."));
        }
    }

    /**
     * Endpoint to list all users (for Admin Portal)
     */
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }
}
