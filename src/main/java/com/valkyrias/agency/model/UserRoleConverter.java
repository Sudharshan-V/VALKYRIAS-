package com.valkyrias.agency.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Reads older lowercase role rows safely while writing the canonical enum
 * names. The database migration still normalizes existing data and adds the
 * allowed-value constraint, but this keeps a deployment bootable during the
 * migration window.
 */
@Converter(autoApply = true)
public class UserRoleConverter implements AttributeConverter<UserRole, String> {

    @Override
    public String convertToDatabaseColumn(UserRole role) {
        return role == null ? null : role.name();
    }

    @Override
    public UserRole convertToEntityAttribute(String value) {
        return value == null ? null : UserRole.fromValue(value);
    }
}
