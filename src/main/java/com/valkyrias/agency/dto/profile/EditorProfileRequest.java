package com.valkyrias.agency.dto.profile;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.valkyrias.agency.model.AvailabilityStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

import java.math.BigDecimal;
import java.util.Set;

@JsonIgnoreProperties(ignoreUnknown = false)
public record EditorProfileRequest(
        @Size(max = 120) String professionalTitle,
        @Min(0) @Max(80) Integer experienceYears,
        @Size(max = 50) Set<@NotBlank @Size(max = 80) String> skills,
        @Size(max = 50) Set<@NotBlank @Size(max = 80) String> softwareUsed,
        @Size(max = 50) Set<@NotBlank @Size(max = 80) String> languages,
        @DecimalMin("0.0") @Digits(integer = 12, fraction = 2) BigDecimal startingPrice,
        @DecimalMin("0.0") @Digits(integer = 12, fraction = 2) BigDecimal hourlyRate,
        @Size(max = 100) String deliveryTime,
        AvailabilityStatus availabilityStatus,
        @Size(max = 3000) String portfolioSummary,
        @Size(max = 30) Set<@NotBlank @Size(max = 150) String> certifications,
        @Size(max = 150) String location,
        @Size(max = 2048) @URL @Pattern(regexp = "^$|^https?://.*", flags = Pattern.Flag.CASE_INSENSITIVE, message = "must use http or https") String websiteUrl,
        @Size(max = 2048) @URL @Pattern(regexp = "^$|^https?://.*", flags = Pattern.Flag.CASE_INSENSITIVE, message = "must use http or https") String instagramUrl,
        @Size(max = 2048) @URL @Pattern(regexp = "^$|^https?://.*", flags = Pattern.Flag.CASE_INSENSITIVE, message = "must use http or https") String linkedinUrl
) {
}
