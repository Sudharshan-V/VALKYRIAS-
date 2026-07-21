package com.valkyrias.agency.security;

import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Component
public class JwtUtil {

    private static final String SECRET_KEY = "valkyrias_super_secret_key_that_is_long_enough_for_sha256_security_production_grade";
    private static final String ALGORITHM = "HmacSHA256";

    public String generateToken(String email, String role, String userId) {
        try {
            String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
            long now = System.currentTimeMillis();
            long exp = now + 1000 * 60 * 60 * 24; // 24 hours
            String payload = String.format("{\"sub\":\"%s\",\"role\":\"%s\",\"userId\":\"%s\",\"exp\":%d}", email, role, userId, exp);

            String base64Header = base64UrlEncode(header.getBytes(StandardCharsets.UTF_8));
            String base64Payload = base64UrlEncode(payload.getBytes(StandardCharsets.UTF_8));

            String signatureInput = base64Header + "." + base64Payload;
            String signature = hmacSha256(signatureInput, SECRET_KEY);

            return signatureInput + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate JWT", e);
        }
    }

    public boolean validateToken(String token, String email) {
        String username = extractUsername(token);
        return (username != null && username.equals(email) && !isTokenExpired(token));
    }

    public String extractUsername(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            int subIndex = payload.indexOf("\"sub\":\"");
            if (subIndex == -1) return null;
            int start = subIndex + 7;
            int end = payload.indexOf("\"", start);
            return payload.substring(start, end);
        } catch (Exception e) {
            return null;
        }
    }

    public String extractRole(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            int roleIndex = payload.indexOf("\"role\":\"");
            if (roleIndex == -1) return null;
            int start = roleIndex + 8;
            int end = payload.indexOf("\"", start);
            return payload.substring(start, end);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isTokenExpired(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return true;
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            int expIndex = payload.indexOf("\"exp\":");
            if (expIndex == -1) return true;
            int start = expIndex + 6;
            int end = start;
            while (end < payload.length() && Character.isDigit(payload.charAt(end))) {
                end++;
            }
            long exp = Long.parseLong(payload.substring(start, end));
            return System.currentTimeMillis() > exp;
        } catch (Exception e) {
            return true;
        }
    }

    private String base64UrlEncode(byte[] input) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(input);
    }

    private String hmacSha256(String data, String key) throws Exception {
        byte[] hash = hmacSha256Bytes(data.getBytes(StandardCharsets.UTF_8), key.getBytes(StandardCharsets.UTF_8));
        return base64UrlEncode(hash);
    }

    private byte[] hmacSha256Bytes(byte[] data, byte[] key) throws Exception {
        Mac sha256_HMAC = Mac.getInstance(ALGORITHM);
        SecretKeySpec secret_key = new SecretKeySpec(key, ALGORITHM);
        sha256_HMAC.init(secret_key);
        return sha256_HMAC.doFinal(data);
    }
}
