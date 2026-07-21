package com.valkyrias.agency.dto.auth;

import com.valkyrias.agency.model.UserRole;

import java.time.OffsetDateTime;

public record AdminUserSummary(
        String email,
        UserRole role,
        String displayName,
        OffsetDateTime createdAt
) {
}
