package com.valkyrias.agency.security;

import com.valkyrias.agency.model.UserRole;

import java.security.Principal;
import java.util.UUID;

public record SupabaseUserPrincipal(
        UUID userId,
        String email,
        String fullName,
        UserRole trustedRole,
        UserRole requestedRegistrationRole
) implements Principal {

    public SupabaseUserPrincipal(UUID userId, String email, String fullName, UserRole trustedRole) {
        this(userId, email, fullName, trustedRole, null);
    }

    @Override
    public String getName() {
        return userId.toString();
    }
}
