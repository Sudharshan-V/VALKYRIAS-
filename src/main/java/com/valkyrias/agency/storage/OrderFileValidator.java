package com.valkyrias.agency.storage;

import com.valkyrias.agency.exception.DomainValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Set;

@Component
public class OrderFileValidator {

    /*
     * These formats are still accepted, but they are stored as generic binary
     * files so browsers download them instead of executing them.
     */
    private static final Set<String> FORCE_DOWNLOAD_TYPES = Set.of(
            "text/html",
            "application/xhtml+xml",
            "image/svg+xml",
            "application/javascript",
            "text/javascript"
    );

    private final long maxBytes;

    public OrderFileValidator(
            @Value("${supabase.storage.max-file-bytes:524288000}") long maxBytes
    ) {
        if (maxBytes <= 0) {
            throw new IllegalArgumentException(
                    "Order file size limit must be greater than zero"
            );
        }

        this.maxBytes = maxBytes;
    }

    public ValidatedOrderFile validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new DomainValidationException(
                    "A non-empty file is required"
            );
        }

        if (file.getSize() > maxBytes) {
            throw new DomainValidationException(
                    "File exceeds the maximum size of "
                            + maxBytes
                            + " bytes"
            );
        }

        String safeFilename = sanitizeFilename(file.getOriginalFilename());
        String contentType = normalizeContentType(file.getContentType());

        /*
         * No extension allowlist and no file-signature comparison.
         * Every file format is accepted as long as it is non-empty
         * and within the configured size limit.
         */
        return new ValidatedOrderFile(
                file,
                safeFilename,
                contentType,
                file.getSize()
        );
    }

    private static String normalizeContentType(String contentType) {
        if (!StringUtils.hasText(contentType)) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        try {
            MediaType parsed = MediaType.parseMediaType(contentType);

            String normalized =
                    parsed.getType().toLowerCase(Locale.ROOT)
                            + "/"
                            + parsed.getSubtype().toLowerCase(Locale.ROOT);

            if (FORCE_DOWNLOAD_TYPES.contains(normalized)) {
                return MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }

            return normalized;
        } catch (InvalidMediaTypeException exception) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
    }

    private static String sanitizeFilename(String original) {
        String leaf = original == null ? "file" : original.replace('\\', '/');

        leaf = leaf.substring(leaf.lastIndexOf('/') + 1).trim();
        leaf = leaf
                .replaceAll("[^A-Za-z0-9._-]", "_")
                .replaceAll("_+", "_");

        while (leaf.startsWith(".")) {
            leaf = leaf.substring(1);
        }

        if (leaf.isBlank()) {
            leaf = "file";
        }

        if (leaf.length() > 180) {
            leaf = leaf.substring(leaf.length() - 180);
        }

        return leaf;
    }
}