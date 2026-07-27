package com.valkyrias.agency.dto.profile;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.valkyrias.agency.model.ClientType;
import com.valkyrias.agency.model.PreferredCommunication;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = false)
public record ClientProfileRequest(
        @Size(max = 150) String companyName,
        ClientType clientType,
        PreferredCommunication preferredCommunication,
        @Size(max = 100) String defaultProjectCategory
) {
}
