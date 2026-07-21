package com.valkyrias.agency.dto.profile;

import com.valkyrias.agency.model.ClientType;
import com.valkyrias.agency.model.PreferredCommunication;

public record ClientProfileResponse(
        String companyName,
        ClientType clientType,
        PreferredCommunication preferredCommunication,
        String defaultProjectCategory
) {
}
