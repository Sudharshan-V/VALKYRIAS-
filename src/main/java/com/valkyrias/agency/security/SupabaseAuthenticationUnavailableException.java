package com.valkyrias.agency.security;

import org.springframework.security.core.AuthenticationException;

public class SupabaseAuthenticationUnavailableException extends AuthenticationException {
    public SupabaseAuthenticationUnavailableException(String message) {
        super(message);
    }

    public SupabaseAuthenticationUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
