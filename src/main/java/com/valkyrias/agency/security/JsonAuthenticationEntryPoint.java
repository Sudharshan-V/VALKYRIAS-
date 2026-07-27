package com.valkyrias.agency.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.valkyrias.agency.exception.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public JsonAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        boolean unavailable = authException instanceof SupabaseAuthenticationUnavailableException;
        boolean configurationMissing = unavailable
                && "Supabase authentication is not configured".equals(authException.getMessage());
        boolean authenticationRequired = !unavailable
                && "Authentication is required".equals(authException.getMessage());
        int status = unavailable ? HttpServletResponse.SC_SERVICE_UNAVAILABLE : HttpServletResponse.SC_UNAUTHORIZED;
        String error = configurationMissing
                ? "AUTH_CONFIGURATION_ERROR"
                : authenticationRequired ? "UNAUTHORIZED" : unavailable ? "AUTH_SERVICE_UNAVAILABLE" : "INVALID_TOKEN";
        String message = configurationMissing
                ? "Supabase authentication is not configured on the server"
                : authenticationRequired
                ? "Authentication is required"
                : unavailable
                ? "Supabase authentication is temporarily unavailable"
                : "The authentication token is invalid or expired";

        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                ApiErrorResponse.of(status, error, message, request.getRequestURI())
        );
    }
}
