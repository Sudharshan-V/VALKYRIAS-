package com.valkyrias.agency.storage;

import com.valkyrias.agency.exception.AvatarValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;

@Component
public class AvatarValidator {

    private final long maxBytes;

    public AvatarValidator(@Value("${supabase.storage.max-avatar-bytes:5242880}") long maxBytes) {
        if (maxBytes <= 0) {
            throw new IllegalArgumentException("Avatar size limit must be positive");
        }
        this.maxBytes = maxBytes;
    }

    public ValidatedAvatar validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AvatarValidationException("Avatar file is required and must not be empty");
        }
        if (file.getSize() > maxBytes) {
            throw new AvatarValidationException("Avatar exceeds the maximum size of " + maxBytes + " bytes");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException exception) {
            throw new AvatarValidationException("Avatar could not be read", exception);
        }

        ImageType detected = detect(bytes);
        String declared = normalizeContentType(file.getContentType());
        if (!detected.contentType.equals(declared)) {
            throw new AvatarValidationException("Avatar content does not match its declared image type");
        }

        return new ValidatedAvatar(bytes, detected.contentType, detected.extension);
    }

    public long getMaxBytes() {
        return maxBytes;
    }

    private static String normalizeContentType(String contentType) {
        if (!StringUtils.hasText(contentType)) {
            return "";
        }
        return contentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
    }

    private static ImageType detect(byte[] bytes) {
        if (bytes.length >= 8
                && unsigned(bytes[0]) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
                && unsigned(bytes[4]) == 0x0D && unsigned(bytes[5]) == 0x0A
                && unsigned(bytes[6]) == 0x1A && unsigned(bytes[7]) == 0x0A) {
            return ImageType.PNG;
        }
        if (bytes.length >= 3
                && unsigned(bytes[0]) == 0xFF && unsigned(bytes[1]) == 0xD8 && unsigned(bytes[2]) == 0xFF) {
            return ImageType.JPEG;
        }
        if (bytes.length >= 12
                && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return ImageType.WEBP;
        }
        throw new AvatarValidationException("Only PNG, JPEG, and WebP avatar images are allowed");
    }

    private static int unsigned(byte value) {
        return value & 0xFF;
    }

    private enum ImageType {
        PNG("image/png", "png"),
        JPEG("image/jpeg", "jpg"),
        WEBP("image/webp", "webp");

        private final String contentType;
        private final String extension;

        ImageType(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }
    }
}
