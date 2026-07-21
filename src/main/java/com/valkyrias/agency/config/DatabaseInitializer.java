package com.valkyrias.agency.config;

import com.valkyrias.agency.model.User;
import com.valkyrias.agency.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Admin User if not existing
        if (!userRepository.existsByEmail("admin@valkyrias.co")) {
            User admin = new User(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "Root Administrator",
                "admin@valkyrias.co",
                passwordEncoder.encode("valkyrias2026"),
                "admin"
            );
            userRepository.save(admin);
            System.out.println(">>> Seeded Admin User: admin@valkyrias.co / valkyrias2026 (BCrypt encoded)");
        }

        // 2. Seed Client User if not existing
        if (!userRepository.existsByEmail("tanishq@reliancejewels.com")) {
            User client = new User(
                UUID.fromString("00000000-0000-0000-0000-000000000002"),
                "Tanishq (Reliance Jewels)",
                "tanishq@reliancejewels.com",
                passwordEncoder.encode("valkyrias2026"),
                "client"
            );
            userRepository.save(client);
            System.out.println(">>> Seeded Client User: tanishq@reliancejewels.com / valkyrias2026 (BCrypt encoded)");
        }

        // 3. Seed Editor User if not existing
        if (!userRepository.existsByEmail("marcus.vane@valkyrias.co")) {
            User editor = new User(
                UUID.fromString("00000000-0000-0000-0000-000000000003"),
                "Marcus Vane",
                "marcus.vane@valkyrias.co",
                passwordEncoder.encode("valkyrias2026"),
                "editor"
            );
            userRepository.save(editor);
            System.out.println(">>> Seeded Editor User: marcus.vane@valkyrias.co / valkyrias2026 (BCrypt encoded)");
        }
    }
}
