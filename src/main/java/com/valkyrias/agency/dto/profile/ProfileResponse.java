package com.valkyrias.agency.dto.profile;

import com.valkyrias.agency.model.UserRole;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProfileResponse(
        UUID applicationUserId,
        UUID supabaseUserId,
        String email,
        UserRole role,
        com.valkyrias.agency.model.AccountStatus accountStatus,
        boolean profileComplete,
        String fullName,
        String displayName,
        String profileImageUrl,
        String phoneNumber,
        String country,
        String timezone,
        String bio,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        ClientProfileResponse clientProfile,
        EditorProfileResponse editorProfile
) {
}
