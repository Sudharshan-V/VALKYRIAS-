package com.valkyrias.agency.dto.profile;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.valkyrias.agency.validation.ValidTimezone;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = false)
public record ProfileUpdateRequest(
        @NotBlank @Size(min = 2, max = 100) String fullName,
        @Size(max = 80) String displayName,
        @Size(max = 30)
        @Pattern(regexp = "^$|^\\+?[0-9 .()\\-]{7,25}$", message = "must be a valid phone number")
        String phoneNumber,
        @Size(max = 100) String country,
        @Size(max = 100) @ValidTimezone String timezone,
        @Size(max = 2000) String bio,
        @Valid ClientProfileRequest clientProfile,
        @Valid EditorProfileRequest editorProfile
) {
}
