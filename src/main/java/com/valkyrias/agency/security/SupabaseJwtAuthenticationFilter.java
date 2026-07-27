package com.valkyrias.agency.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.UserRepository;

import java.io.IOException;
import java.util.List;

@Component
public class SupabaseJwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final SupabaseAuthClient authClient;
    private final JsonAuthenticationEntryPoint authenticationEntryPoint;
    private final UserRepository userRepository;

    public SupabaseJwtAuthenticationFilter(
            SupabaseAuthClient authClient,
            JsonAuthenticationEntryPoint authenticationEntryPoint,
            UserRepository userRepository
    ) {
        this.authClient = authClient;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.userRepository = userRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || ("GET".equalsIgnoreCase(request.getMethod()) && path.equals("/api/services"))
                || ("GET".equalsIgnoreCase(request.getMethod()) && path.equals("/api/portfolio-items/public"))
                // Retired routes intentionally fall through to MVC's 404 handling.
                || path.equals("/api/auth/login")
                || path.equals("/api/auth/register")
                || !path.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || authorization.isBlank()) {
            authenticationEntryPoint.commence(
                    request,
                    response,
                    new BadCredentialsException("Authentication is required")
            );
            return;
        }

        if (!authorization.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            authenticationEntryPoint.commence(
                    request,
                    response,
                    new BadCredentialsException("The authentication token is invalid or expired")
            );
            return;
        }

        String token = authorization.substring(BEARER_PREFIX.length()).trim();
        if (token.isEmpty()) {
            authenticationEntryPoint.commence(
                    request,
                    response,
                    new BadCredentialsException("The authentication token is invalid or expired")
            );
            return;
        }

        try {
            SupabaseUserPrincipal principal = authClient.verify(token);
            UserRole role = userRepository.findBySupabaseUserId(principal.userId())
                    .filter(user -> user.getAccountStatus() == com.valkyrias.agency.model.AccountStatus.ACTIVE)
                    .map(user -> user.getRole())
                    .orElse(null);
            SupabaseUserPrincipal applicationPrincipal = new SupabaseUserPrincipal(
                    principal.userId(),
                    principal.email(),
                    principal.fullName(),
                    role,
                    null
            );
            var authorities = role == null
                    ? List.<SimpleGrantedAuthority>of()
                    : List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
            var authentication = new UsernamePasswordAuthenticationToken(
                    applicationPrincipal,
                    null,
                    authorities
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (org.springframework.security.core.AuthenticationException exception) {
            SecurityContextHolder.clearContext();
            authenticationEntryPoint.commence(request, response, exception);
        }
    }
}
