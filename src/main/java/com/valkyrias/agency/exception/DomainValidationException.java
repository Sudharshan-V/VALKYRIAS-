package com.valkyrias.agency.exception;

public class DomainValidationException extends RuntimeException {
    public DomainValidationException(String message) { super(message); }
}
