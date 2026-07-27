package com.valkyrias.agency.storage;

import org.springframework.web.multipart.MultipartFile;

public record ValidatedOrderFile(
        MultipartFile file,
        String safeFilename,
        String contentType,
        long sizeBytes
) {}
