package com.valkyrias.agency.storage;

import com.valkyrias.agency.model.FileCategory;

import java.util.UUID;

public interface OrderFileStorageService {
    String upload(UUID orderId, UUID fileId, FileCategory category, ValidatedOrderFile file);
    String createSignedUrl(String objectPath);
    void delete(String objectPath);
    String bucket();
    long signedUrlTtlSeconds();
}
