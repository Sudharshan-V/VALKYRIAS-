package com.valkyrias.agency.dto.auth;

import com.valkyrias.agency.model.UserRole;

/**
 * Deliberately small response used by the retained legacy auth endpoints.
 * Private profile fields and internal persistence/security values never leave
 * those endpoints.
 */
public record AuthenticatedUserSummary(
        String name,
        String email,
        UserRole role
) {
}
