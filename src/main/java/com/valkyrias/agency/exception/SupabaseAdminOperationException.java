package com.valkyrias.agency.exception;

public class SupabaseAdminOperationException extends RuntimeException {
    public SupabaseAdminOperationException(String message) {
        super(message);
    }

    public SupabaseAdminOperationException(String message, Throwable cause) {
        super(message, cause);
    }
}
