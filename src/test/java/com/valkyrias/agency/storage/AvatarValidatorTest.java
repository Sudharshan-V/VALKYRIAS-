package com.valkyrias.agency.storage;

import com.valkyrias.agency.exception.AvatarValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AvatarValidatorTest {

    private final AvatarValidator validator = new AvatarValidator(32);

    @Test
    void acceptsPngJpegAndWebpByDeclaredTypeAndMagicBytes() {
        ValidatedAvatar png = validator.validate(file("avatar.png", "image/png",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}));
        ValidatedAvatar jpeg = validator.validate(file("avatar.jpeg", "image/jpeg",
                new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x01}));
        ValidatedAvatar webp = validator.validate(file("avatar.webp", "image/webp",
                new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'}));

        assertThat(png.extension()).isEqualTo("png");
        assertThat(jpeg.extension()).isEqualTo("jpg");
        assertThat(webp.extension()).isEqualTo("webp");
    }

    @Test
    void rejectsEmptyOversizeUnknownAndMismatchedContent() {
        AvatarValidator tinyValidator = new AvatarValidator(8);

        assertThatThrownBy(() -> validator.validate(file("empty.png", "image/png", new byte[0])))
                .isInstanceOf(AvatarValidationException.class)
                .hasMessageContaining("must not be empty");
        assertThatThrownBy(() -> tinyValidator.validate(file("large.png", "image/png", new byte[9])))
                .isInstanceOf(AvatarValidationException.class)
                .hasMessageContaining("maximum size");
        assertThatThrownBy(() -> validator.validate(file("text.png", "image/png", "not an image".getBytes())))
                .isInstanceOf(AvatarValidationException.class)
                .hasMessageContaining("Only PNG, JPEG, and WebP");
        assertThatThrownBy(() -> validator.validate(file("spoof.jpg", "image/jpeg",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})))
                .isInstanceOf(AvatarValidationException.class)
                .hasMessageContaining("does not match");
    }

    private static MockMultipartFile file(String name, String contentType, byte[] bytes) {
        return new MockMultipartFile("file", name, contentType, bytes);
    }
}
