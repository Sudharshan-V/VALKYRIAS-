package com.valkyrias.agency.security;

import com.valkyrias.agency.model.UserRole;

import java.security.Principal;
import java.util.UUID;

public record SupabaseUserPrincipal(
        UUID userId,
        String email,
        String fullName,
        UserRole trustedRole
) implements Principal {

    @Override
    public String getName() {
        return userId.toString();
    }
}
