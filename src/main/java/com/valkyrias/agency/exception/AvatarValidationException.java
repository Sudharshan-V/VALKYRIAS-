package com.valkyrias.agency.exception;

public class AvatarValidationException extends RuntimeException {
    public AvatarValidationException(String message) {
        super(message);
    }

    public AvatarValidationException(String message, Throwable cause) {
        super(message, cause);
    }
}
