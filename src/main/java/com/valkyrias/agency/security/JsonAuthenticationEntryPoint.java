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
        int status = unavailable ? HttpServletResponse.SC_SERVICE_UNAVAILABLE : HttpServletResponse.SC_UNAUTHORIZED;
        String error = unavailable ? "Authentication service unavailable" : "Unauthorized";

        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                ApiErrorResponse.of(status, error, authException.getMessage(), request.getRequestURI())
        );
    }
}
