package com.valkyrias.agency.config;

import com.valkyrias.agency.model.User;
import com.valkyrias.agency.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseInitializer.class);

    private final UserRepository userRepository;
    private final boolean enabled;
    private final String seedPassword;

    public DatabaseInitializer(
            UserRepository userRepository,
            @Value("${app.seed-users.enabled:false}") boolean enabled,
            @Value("${app.seed-users.password:}") String seedPassword
    ) {
        this.userRepository = userRepository;
        this.enabled = enabled;
        this.seedPassword = seedPassword;
    }

    @Override
    public void run(String... args) {
        if (!enabled) {
            return;
        }
        if (!StringUtils.hasText(seedPassword)) {
            log.warn("Demo user seeding was enabled without APP_SEED_PASSWORD; no users were seeded");
            return;
        }

        // 1. Seed Admin User if not existing
        if (!userRepository.existsByEmailIgnoreCase("admin@valkyrias.co")) {
            User admin = new User(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "Root Administrator",
                "admin@valkyrias.co",
                seedPassword,
                "admin"
            );
            userRepository.save(admin);
            log.info("Seeded local admin demo account");
        }

        // 2. Seed Client User if not existing
        if (!userRepository.existsByEmailIgnoreCase("tanishq@reliancejewels.com")) {
            User client = new User(
                UUID.fromString("00000000-0000-0000-0000-000000000002"),
                "Tanishq (Reliance Jewels)",
                "tanishq@reliancejewels.com",
                seedPassword,
                "client"
            );
            userRepository.save(client);
            log.info("Seeded local client demo account");
        }

        // 3. Seed Editor User if not existing
        if (!userRepository.existsByEmailIgnoreCase("marcus.vane@valkyrias.co")) {
            User editor = new User(
                UUID.fromString("00000000-0000-0000-0000-000000000003"),
                "Marcus Vane",
                "marcus.vane@valkyrias.co",
                seedPassword,
                "editor"
            );
            userRepository.save(editor);
            log.info("Seeded local editor demo account");
        }
    }
}
