package com.valkyrias.agency.storage;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.valkyrias.agency.exception.FileStorageException;
import com.valkyrias.agency.model.FileCategory;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SupabaseOrderFileStorageService implements OrderFileStorageService {
    private final RestClient restClient;
    private final String supabaseUrl;
    private final String serviceRoleKey;
    private final String bucket;
    private final long signedUrlTtlSeconds;

    public SupabaseOrderFileStorageService(
            RestClient.Builder builder,
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.service-role-key:}") String serviceRoleKey,
            @Value("${supabase.storage.order-files-bucket:order-files}") String bucket,
            @Value("${supabase.storage.signed-url-ttl-seconds:3600}") long signedUrlTtlSeconds
    ) {
        this.restClient = builder.build();
        this.supabaseUrl = normalizeBaseUrl(supabaseUrl);
        this.serviceRoleKey = serviceRoleKey == null ? "" : serviceRoleKey.trim();
        if (!StringUtils.hasText(bucket) || !bucket.matches("[A-Za-z0-9._-]+")) {
            throw new IllegalArgumentException("Invalid order file bucket name");
        }
        if (signedUrlTtlSeconds <= 0) throw new IllegalArgumentException("Signed URL TTL must be positive");
        this.bucket = bucket;
        this.signedUrlTtlSeconds = signedUrlTtlSeconds;
    }

    @Override
    public String upload(UUID orderId, UUID fileId, FileCategory category, ValidatedOrderFile file) {
        requireConfigured();
        String path = "orders/" + orderId + "/" + folder(category) + "/" + fileId + "-" + file.safeFilename();
        try {
            restClient.post().uri(objectUri("/storage/v1/object", path))
                    .headers(this::applyServiceHeaders).header("x-upsert", "false")
                    .contentType(MediaType.parseMediaType(file.contentType()))
                    .contentLength(file.sizeBytes())
                    .body(file.file().getResource())
                    .retrieve().toBodilessEntity();
            return path;
        } catch (RestClientException exception) {
            throw new FileStorageException("File upload failed", exception);
        }
    }

    @Override
    public String createSignedUrl(String objectPath) {
        requireConfigured();
        validatePath(objectPath);
        try {
            SignedUrlPayload result = restClient.post().uri(objectUri("/storage/v1/object/sign", objectPath))
                    .headers(this::applyServiceHeaders).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", signedUrlTtlSeconds)).retrieve().body(SignedUrlPayload.class);
            if (result == null || !StringUtils.hasText(result.signedUrl())) {
                throw new FileStorageException("Supabase did not return a signed file URL");
            }
            if (result.signedUrl().startsWith("http://") || result.signedUrl().startsWith("https://")) {
                return result.signedUrl();
            }
            return supabaseUrl + (result.signedUrl().startsWith("/storage/v1/")
                    ? result.signedUrl()
                    : "/storage/v1" + (result.signedUrl().startsWith("/") ? "" : "/") + result.signedUrl());
        } catch (RestClientException exception) {
            throw new FileStorageException("File URL generation failed", exception);
        }
    }

    @Override
    public void delete(String objectPath) {
        if (!StringUtils.hasText(objectPath)) return;
        requireConfigured();
        validatePath(objectPath);
        try {
            restClient.method(HttpMethod.DELETE).uri(bucketUri("/storage/v1/object"))
                    .headers(this::applyServiceHeaders).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("prefixes", List.of(objectPath))).retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            throw new FileStorageException("File cleanup failed", exception);
        }
    }

    @Override public String bucket() { return bucket; }
    @Override public long signedUrlTtlSeconds() { return signedUrlTtlSeconds; }

    private void applyServiceHeaders(HttpHeaders headers) {
    headers.set("apikey", serviceRoleKey);

    if (serviceRoleKey.startsWith("sb_secret_")) {
        // New Supabase secret keys are API keys, not JWT bearer tokens.
        headers.remove(HttpHeaders.AUTHORIZATION);
    } else {
        // Legacy service_role keys begin with eyJ and are JWTs.
        headers.setBearerAuth(serviceRoleKey);
    }

    headers.setAccept(List.of(MediaType.APPLICATION_JSON));
}

    private URI objectUri(String endpoint, String path) {
        validatePath(path);
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(supabaseUrl + endpoint).pathSegment(bucket);
        Arrays.stream(path.split("/")).forEach(builder::pathSegment);
        return builder.build().encode().toUri();
    }

    private URI bucketUri(String endpoint) {
        return UriComponentsBuilder.fromUriString(supabaseUrl + endpoint).pathSegment(bucket).build().encode().toUri();
    }

    private void requireConfigured() {
        if (!StringUtils.hasText(supabaseUrl) || !StringUtils.hasText(serviceRoleKey)) {
            throw new FileStorageException("Supabase order file Storage is not configured");
        }
    }

    private static String folder(FileCategory category) {
        return switch (category) {
            case CLIENT_ASSET -> "client-assets";
            case CHAT_ATTACHMENT -> "chat";
            case PREVIEW -> "previews";
            case DELIVERABLE -> "deliverables";
            case PORTFOLIO_MEDIA -> "portfolio";
        };
    }

    private static void validatePath(String path) {
        if (!StringUtils.hasText(path) || path.startsWith("/") || path.contains("..") || path.contains("\\")) {
            throw new FileStorageException("Invalid file object path");
        }
    }

    private static String normalizeBaseUrl(String value) {
        if (!StringUtils.hasText(value)) return "";
        String normalized = value.trim();
        while (normalized.endsWith("/")) normalized = normalized.substring(0, normalized.length() - 1);
        return normalized.endsWith("/rest/v1")
                ? normalized.substring(0, normalized.length() - "/rest/v1".length()) : normalized;
    }

    private record SignedUrlPayload(@JsonAlias({"signedURL", "signedUrl"}) String signedUrl) {}
}
