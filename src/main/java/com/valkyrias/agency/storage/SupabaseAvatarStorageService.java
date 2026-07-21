package com.valkyrias.agency.storage;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.valkyrias.agency.exception.ProfileStorageException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

@Service
public class SupabaseAvatarStorageService implements AvatarStorageService {

    private final RestClient restClient;
    private final String supabaseUrl;
    private final String serviceRoleKey;
    private final String bucket;
    private final long signedUrlTtlSeconds;

    public SupabaseAvatarStorageService(
            RestClient.Builder restClientBuilder,
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.service-role-key:}") String serviceRoleKey,
            @Value("${supabase.storage.profile-bucket:profile-avatars}") String bucket,
            @Value("${supabase.storage.signed-url-ttl-seconds:3600}") long signedUrlTtlSeconds
    ) {
        this.restClient = restClientBuilder.build();
        this.supabaseUrl = normalizeBaseUrl(supabaseUrl);
        this.serviceRoleKey = serviceRoleKey == null ? "" : serviceRoleKey.trim();
        this.bucket = validateBucket(bucket);
        if (signedUrlTtlSeconds <= 0) {
            throw new IllegalArgumentException("Signed URL TTL must be positive");
        }
        this.signedUrlTtlSeconds = signedUrlTtlSeconds;
    }

    @Override
    public String upload(UUID ownerId, ValidatedAvatar avatar) {
        requireConfigured();
        String objectPath = ownerId + "/avatars/" + UUID.randomUUID() + "." + avatar.extension();
        try {
            restClient.post()
                    .uri(objectUri("/storage/v1/object", objectPath))
                    .headers(this::applyServiceHeaders)
                    .header("x-upsert", "false")
                    .contentType(MediaType.parseMediaType(avatar.contentType()))
                    .body(avatar.bytes())
                    .retrieve()
                    .toBodilessEntity();
            return objectPath;
        } catch (RestClientException exception) {
            throw new ProfileStorageException("Avatar upload failed", exception);
        }
    }

    @Override
    public void delete(String objectPath) {
        if (!StringUtils.hasText(objectPath)) {
            return;
        }
        requireConfigured();
        validateObjectPath(objectPath);
        try {
            restClient.method(HttpMethod.DELETE)
                    .uri(bucketUri("/storage/v1/object"))
                    .headers(this::applyServiceHeaders)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("prefixes", java.util.List.of(objectPath)))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException exception) {
            throw new ProfileStorageException("Avatar deletion failed", exception);
        }
    }

    @Override
    public String createSignedUrl(String objectPath) {
        if (!StringUtils.hasText(objectPath)) {
            return null;
        }
        requireConfigured();
        validateObjectPath(objectPath);
        try {
            SignedUrlPayload payload = restClient.post()
                    .uri(objectUri("/storage/v1/object/sign", objectPath))
                    .headers(this::applyServiceHeaders)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", signedUrlTtlSeconds))
                    .retrieve()
                    .body(SignedUrlPayload.class);

            if (payload == null || !StringUtils.hasText(payload.signedUrl())) {
                throw new ProfileStorageException("Supabase did not return an avatar URL");
            }
            String signedUrl = payload.signedUrl();
            if (signedUrl.startsWith("http://") || signedUrl.startsWith("https://")) {
                return signedUrl;
            }
            if (signedUrl.startsWith("/storage/v1/")) {
                return supabaseUrl + signedUrl;
            }
            return supabaseUrl + "/storage/v1" + (signedUrl.startsWith("/") ? signedUrl : "/" + signedUrl);
        } catch (ProfileStorageException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new ProfileStorageException("Avatar URL generation failed", exception);
        }
    }

    private void applyServiceHeaders(HttpHeaders headers) {
        headers.set("apikey", serviceRoleKey);
        headers.setBearerAuth(serviceRoleKey);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
    }

    private URI objectUri(String endpoint, String objectPath) {
        validateObjectPath(objectPath);
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(supabaseUrl + endpoint)
                .pathSegment(bucket);
        Arrays.stream(objectPath.split("/"))
                .forEach(builder::pathSegment);
        return builder.build().encode().toUri();
    }

    private URI bucketUri(String endpoint) {
        return UriComponentsBuilder.fromUriString(supabaseUrl + endpoint)
                .pathSegment(bucket)
                .build()
                .encode()
                .toUri();
    }

    private void requireConfigured() {
        if (!StringUtils.hasText(supabaseUrl) || !StringUtils.hasText(serviceRoleKey)) {
            throw new ProfileStorageException("Supabase Storage is not configured");
        }
    }

    private static String normalizeBaseUrl(String rawUrl) {
        if (!StringUtils.hasText(rawUrl)) {
            return "";
        }
        String value = rawUrl.trim();
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        if (value.endsWith("/rest/v1")) {
            value = value.substring(0, value.length() - "/rest/v1".length());
        }
        return value;
    }

    private static String validateBucket(String bucket) {
        if (!StringUtils.hasText(bucket) || !bucket.matches("[A-Za-z0-9._-]+")) {
            throw new IllegalArgumentException("Invalid Supabase profile bucket name");
        }
        return bucket;
    }

    private static void validateObjectPath(String objectPath) {
        if (objectPath.startsWith("/") || objectPath.contains("..") || objectPath.contains("\\")) {
            throw new ProfileStorageException("Invalid avatar object path");
        }
    }

    private record SignedUrlPayload(
            @JsonAlias({"signedURL", "signedUrl"}) String signedUrl
    ) {
    }
}
