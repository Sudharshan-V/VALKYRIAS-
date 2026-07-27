package com.valkyrias.agency.model;

import java.util.Locale;

public enum UserRole {
    CLIENT,
    EDITOR,
    ADMIN;

    public static UserRole fromValue(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("A user role is required");
        }
        return UserRole.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }

    public static UserRole publicRegistrationRole(String value) {
        if (value != null && !value.isBlank()) {
            fromValue(value);
        }
        return CLIENT;
    }
}
