package com.valkyrias.agency.security;

import com.valkyrias.agency.exception.DomainValidationException;
import com.valkyrias.agency.exception.SupabaseAdminOperationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.util.UUID;

@Component
public class SupabaseAdminAuthClient {

    private final RestClient restClient;
    private final String supabaseUrl;
    private final String serviceRoleKey;

    public SupabaseAdminAuthClient(
            RestClient.Builder restClientBuilder,
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.service-role-key:}") String serviceRoleKey
    ) {
        this.restClient = restClientBuilder.build();
        this.supabaseUrl = SupabaseAuthClient.normalizeBaseUrl(supabaseUrl);
        this.serviceRoleKey = serviceRoleKey == null ? "" : serviceRoleKey.trim();
    }

    public void deleteUser(UUID supabaseUserId) {
        if (supabaseUserId == null) {
            return;
        }
        requireConfigured();

        try {
            restClient.method(HttpMethod.DELETE)
                    .uri(URI.create(supabaseUrl + "/auth/v1/admin/users/" + supabaseUserId))
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                return;
            }
            if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 403) {
                throw new DomainValidationException(
                        "Permanent user deletion requires a valid backend SUPABASE_SERVICE_ROLE_KEY"
                );
            }
            throw new SupabaseAdminOperationException("Supabase Auth could not delete the user", exception);
        } catch (ResourceAccessException exception) {
            throw new SupabaseAdminOperationException("Supabase Auth is temporarily unavailable", exception);
        } catch (RestClientException | IllegalArgumentException exception) {
            throw new SupabaseAdminOperationException("Supabase Auth could not delete the user", exception);
        }
    }

    private void requireConfigured() {
        if (!StringUtils.hasText(supabaseUrl) || !StringUtils.hasText(serviceRoleKey)) {
            throw new DomainValidationException(
                    "Permanent user deletion requires SUPABASE_SERVICE_ROLE_KEY in the backend environment"
            );
        }
    }
}
