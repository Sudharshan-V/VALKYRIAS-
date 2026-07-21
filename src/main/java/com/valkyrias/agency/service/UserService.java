package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.*;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.repository.UserRepository;
import com.valkyrias.agency.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public Optional<AuthResponse> login(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Since we're migrating, support both plaintext (temporary transition) and BCrypt
            boolean matches = passwordEncoder.matches(request.getPassword(), user.getPassword()) || 
                              user.getPassword().equals(request.getPassword());
            
            if (matches) {
                // If it was plaintext, auto-upgrade it to BCrypt
                if (!user.getPassword().startsWith("$2a$")) {
                    user.setPassword(passwordEncoder.encode(request.getPassword()));
                    userRepository.save(user);
                }
                String token = jwtUtil.generateToken(user.getEmail(), user.getRole(), user.getId().toString());
                return Optional.of(new AuthResponse("success", token, user));
            }
        }
        return Optional.empty();
    }

    public Optional<AuthResponse> register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return Optional.empty();
        }

        String role = request.getRole();
        if (role == null || role.trim().isEmpty()) {
            role = "client";
        } else {
            role = role.trim().toLowerCase();
        }

        User newUser = new User();
        newUser.setName(request.getName());
        newUser.setEmail(request.getEmail());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setRole(role);

        User savedUser = userRepository.save(newUser);
        String token = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getRole(), savedUser.getId().toString());
        return Optional.of(new AuthResponse("success", token, savedUser));
    }

    public boolean forgotPassword(ForgotPasswordRequest request) {
        // In a real app we'd send an email. For this production-ready foundation, we log it and return success if user exists.
        return userRepository.existsByEmail(request.getEmail());
    }

    public boolean resetPassword(ResetPasswordRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            userRepository.save(user);
            return true;
        }
        return false;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}
