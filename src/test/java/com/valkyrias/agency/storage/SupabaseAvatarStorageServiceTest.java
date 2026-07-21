package com.valkyrias.agency.storage;

import com.valkyrias.agency.exception.ProfileStorageException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SupabaseAvatarStorageServiceTest {

    @Test
    void uploadsToRandomizedOwnerPathWithoutUsingOriginalFilename() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseAvatarStorageService storage = service(builder);
        UUID ownerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

        server.expect(request -> {
                    assertThat(request.getMethod()).isEqualTo(HttpMethod.POST);
                    assertThat(request.getURI().toString())
                            .matches("https://project\\.supabase\\.co/storage/v1/object/profile-avatars/"
                                    + ownerId + "/avatars/[0-9a-f-]+\\.png");
                    assertThat(request.getHeaders().getFirst("x-upsert")).isEqualTo("false");
                    assertThat(request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION)).isEqualTo("Bearer service-key");
                })
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        String path = storage.upload(ownerId, new ValidatedAvatar(new byte[]{1, 2}, "image/png", "png"));

        assertThat(path).startsWith(ownerId + "/avatars/").endsWith(".png");
        assertThat(path).doesNotContain("unsafe-name");
        server.verify();
    }

    @Test
    void deletesUsingBucketEndpointAndPrefixesBody() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseAvatarStorageService storage = service(builder);
        String path = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/avatars/avatar.png";

        server.expect(requestTo("https://project.supabase.co/storage/v1/object/profile-avatars"))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header("apikey", "service-key"))
                .andExpect(content().json("{\"prefixes\":[\"" + path + "\"]}"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        storage.delete(path);
        server.verify();
    }

    @Test
    void resolvesStorageRelativeSignedUrlAgainstStorageApiBase() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseAvatarStorageService storage = service(builder);
        String path = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/avatars/avatar.png";

        server.expect(requestTo("https://project.supabase.co/storage/v1/object/sign/profile-avatars/" + path))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().json("{\"expiresIn\":3600}"))
                .andRespond(withSuccess("{\"signedURL\":\"/object/sign/profile-avatars/path?token=abc\"}", MediaType.APPLICATION_JSON));

        assertThat(storage.createSignedUrl(path))
                .isEqualTo("https://project.supabase.co/storage/v1/object/sign/profile-avatars/path?token=abc");
        server.verify();
    }

    @Test
    void rejectsUnsafeInternalPathsAndMissingConfiguration() {
        SupabaseAvatarStorageService storage = service(RestClient.builder());
        assertThatThrownBy(() -> storage.delete("../another-user/avatar.png"))
                .isInstanceOf(ProfileStorageException.class)
                .hasMessageContaining("Invalid avatar object path");

        SupabaseAvatarStorageService unconfigured = new SupabaseAvatarStorageService(
                RestClient.builder(), "", "", "profile-avatars", 3600
        );
        assertThatThrownBy(() -> unconfigured.upload(
                UUID.randomUUID(),
                new ValidatedAvatar(new byte[]{1}, "image/png", "png")))
                .isInstanceOf(ProfileStorageException.class)
                .hasMessageContaining("not configured");
    }

    private static SupabaseAvatarStorageService service(RestClient.Builder builder) {
        return new SupabaseAvatarStorageService(
                builder,
                "https://project.supabase.co/rest/v1/",
                "service-key",
                "profile-avatars",
                3600
        );
    }
}
