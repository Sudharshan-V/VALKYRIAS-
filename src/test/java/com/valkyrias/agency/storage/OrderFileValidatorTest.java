package com.valkyrias.agency.storage;

import com.valkyrias.agency.exception.DomainValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderFileValidatorTest {
    private final OrderFileValidator validator = new OrderFileValidator(32);

    @Test
    void sanitizesBrowserFilenameAndAcceptsMatchingContentSignature() {
        byte[] png = new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1};
        var validated = validator.validate(new MockMultipartFile(
                "file", "../../client brief?.png", "image/png", png
        ));

        assertThat(validated.safeFilename()).isEqualTo("client_brief_.png");
        assertThat(validated.contentType()).isEqualTo("image/png");
        assertThat(validated.sizeBytes()).isEqualTo(png.length);
    }

    @Test
    void rejectsSpoofedTypeUnsupportedContentAndOversizedFile() {
        assertThatThrownBy(() -> validator.validate(new MockMultipartFile(
                "file", "fake.png", "image/png", "not an image".getBytes()
        ))).isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("does not match");

        assertThatThrownBy(() -> validator.validate(new MockMultipartFile(
                "file", "payload.exe", "application/octet-stream", new byte[] {1}
        ))).isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("not allowed");

        assertThatThrownBy(() -> validator.validate(new MockMultipartFile(
                "file", "large.txt", "text/plain", new byte[33]
        ))).isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("maximum size");
    }
}
