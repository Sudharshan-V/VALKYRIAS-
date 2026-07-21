package com.valkyrias.agency.dto.profile;

import com.valkyrias.agency.model.AvailabilityStatus;

import java.math.BigDecimal;
import java.util.List;

public record EditorProfileResponse(
        String professionalTitle,
        Integer experienceYears,
        List<String> skills,
        List<String> softwareUsed,
        List<String> languages,
        BigDecimal startingPrice,
        BigDecimal hourlyRate,
        String deliveryTime,
        AvailabilityStatus availabilityStatus,
        String portfolioSummary,
        List<String> certifications,
        String location,
        String websiteUrl,
        String instagramUrl,
        String linkedinUrl
) {
}
