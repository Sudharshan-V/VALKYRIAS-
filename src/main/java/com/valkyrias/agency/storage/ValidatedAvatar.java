package com.valkyrias.agency.storage;

public record ValidatedAvatar(byte[] bytes, String contentType, String extension) {
}
