package com.valkyrias.agency.dto.profile;

import com.valkyrias.agency.model.UserRole;

import java.time.OffsetDateTime;

public record ProfileResponse(
        String email,
        UserRole role,
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
