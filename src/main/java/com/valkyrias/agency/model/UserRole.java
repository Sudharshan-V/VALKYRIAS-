package com.valkyrias.agency.model;

import java.util.Locale;

public enum UserRole {
    CLIENT,
    EDITOR,
    ADMIN;

    public static UserRole fromValue(String value) {
        if (value == null || value.isBlank()) {
            return CLIENT;
        }
        return UserRole.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
