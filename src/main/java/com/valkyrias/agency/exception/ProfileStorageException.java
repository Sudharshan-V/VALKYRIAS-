package com.valkyrias.agency.exception;

public class ProfileStorageException extends RuntimeException {
    public ProfileStorageException(String message) {
        super(message);
    }

    public ProfileStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
