package com.valkyrias.agency.security;

import com.valkyrias.agency.model.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SupabaseAuthClientTest {

    @Test
    void verifiesBearerWithSupabaseAndTrustsOnlyAppMetadataRole() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseAuthClient client = new SupabaseAuthClient(
                builder,
                "https://project.supabase.co/rest/v1/",
                "publishable-key"
        );
        server.expect(requestTo("https://project.supabase.co/auth/v1/user"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("apikey", "publishable-key"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andRespond(withSuccess("""
                        {
                          "id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                          "email":"verified@example.com",
                          "user_metadata":{"full_name":"Verified User","role":"ADMIN"},
                          "app_metadata":{"role":"EDITOR"}
                        }
                        """, MediaType.APPLICATION_JSON));

        SupabaseUserPrincipal principal = client.verify("access-token");

        assertThat(principal.userId()).isEqualTo(java.util.UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));
        assertThat(principal.email()).isEqualTo("verified@example.com");
        assertThat(principal.fullName()).isEqualTo("Verified User");
        assertThat(principal.trustedRole()).isEqualTo(UserRole.EDITOR);
        server.verify();
    }

    @Test
    void mapsProvider4xxTo401AuthenticationFailure() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseAuthClient client = new SupabaseAuthClient(builder, "https://project.supabase.co", "key");
        server.expect(requestTo("https://project.supabase.co/auth/v1/user"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> client.verify("bad-token"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("invalid or expired");
        server.verify();
    }

    @Test
    void mapsProvider5xxTo503AuthenticationUnavailableFailure() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseAuthClient client = new SupabaseAuthClient(builder, "https://project.supabase.co", "key");
        server.expect(requestTo("https://project.supabase.co/auth/v1/user"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> client.verify("valid-token"))
                .isInstanceOf(SupabaseAuthenticationUnavailableException.class)
                .hasMessageContaining("temporarily unavailable");
        server.verify();
    }

    @Test
    void mapsUnreadableProviderResponseToAuthenticationUnavailableFailure() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseAuthClient client = new SupabaseAuthClient(builder, "https://project.supabase.co", "key");
        server.expect(requestTo("https://project.supabase.co/auth/v1/user"))
                .andRespond(withSuccess("not-json", MediaType.TEXT_PLAIN));

        assertThatThrownBy(() -> client.verify("valid-token"))
                .isInstanceOf(SupabaseAuthenticationUnavailableException.class)
                .hasMessageContaining("unreadable response");
        server.verify();
    }

    @Test
    void missingConfigurationFailsClosedWithoutCallingNetwork() {
        SupabaseAuthClient client = new SupabaseAuthClient(RestClient.builder(), "", "");

        assertThatThrownBy(() -> client.verify("token"))
                .isInstanceOf(SupabaseAuthenticationUnavailableException.class)
                .hasMessageContaining("not configured");
    }
}
