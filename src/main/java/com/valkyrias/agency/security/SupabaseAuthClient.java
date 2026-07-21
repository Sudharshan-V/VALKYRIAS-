package com.valkyrias.agency.security;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.valkyrias.agency.model.UserRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.util.Map;
import java.util.UUID;

@Component
public class SupabaseAuthClient {

    private final RestClient restClient;
    private final String supabaseUrl;
    private final String publishableKey;

    public SupabaseAuthClient(
            RestClient.Builder restClientBuilder,
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.publishable-key:}") String publishableKey
    ) {
        this.restClient = restClientBuilder.build();
        this.supabaseUrl = normalizeBaseUrl(supabaseUrl);
        this.publishableKey = publishableKey == null ? "" : publishableKey.trim();
    }

    public SupabaseUserPrincipal verify(String accessToken) {
        if (!StringUtils.hasText(supabaseUrl) || !StringUtils.hasText(publishableKey)) {
            throw new SupabaseAuthenticationUnavailableException("Supabase authentication is not configured");
        }

        try {
            SupabaseUserPayload payload = restClient.get()
                    .uri(URI.create(supabaseUrl + "/auth/v1/user"))
                    .header("apikey", publishableKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(SupabaseUserPayload.class);

            if (payload == null || !StringUtils.hasText(payload.id()) || !StringUtils.hasText(payload.email())) {
                throw new BadCredentialsException("Supabase returned an incomplete user identity");
            }

            UUID userId;
            try {
                userId = UUID.fromString(payload.id());
            } catch (IllegalArgumentException exception) {
                throw new BadCredentialsException("Supabase returned an invalid user identity", exception);
            }

            return new SupabaseUserPrincipal(
                    userId,
                    payload.email().trim(),
                    metadataText(payload.userMetadata(), "full_name", "name"),
                    trustedRole(payload.appMetadata())
            );
        } catch (BadCredentialsException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().is5xxServerError() || exception.getStatusCode().value() == 429) {
                throw new SupabaseAuthenticationUnavailableException(
                        "Supabase authentication is temporarily unavailable",
                        exception
                );
            }
            throw new BadCredentialsException("Bearer token is invalid or expired", exception);
        } catch (ResourceAccessException exception) {
            throw new SupabaseAuthenticationUnavailableException("Supabase authentication is temporarily unavailable", exception);
        } catch (RestClientException exception) {
            throw new SupabaseAuthenticationUnavailableException(
                    "Supabase authentication returned an unreadable response",
                    exception
            );
        } catch (IllegalArgumentException exception) {
            throw new SupabaseAuthenticationUnavailableException("Supabase authentication URL is invalid", exception);
        }
    }

    private static UserRole trustedRole(Map<String, Object> appMetadata) {
        String value = metadataText(appMetadata, "role", "user_role");
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return UserRole.fromValue(value);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private static String metadataText(Map<String, Object> metadata, String... keys) {
        if (metadata == null) {
            return null;
        }
        for (String key : keys) {
            Object value = metadata.get(key);
            if (value instanceof String text && StringUtils.hasText(text)) {
                return text.trim();
            }
        }
        return null;
    }

    static String normalizeBaseUrl(String rawUrl) {
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

    private record SupabaseUserPayload(
            String id,
            String email,
            @JsonProperty("user_metadata") Map<String, Object> userMetadata,
            @JsonProperty("app_metadata") Map<String, Object> appMetadata
    ) {
    }
}
