package com.ticketflow.event_service.security;

import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.UUID;

public record CurrentUser(UUID id, boolean admin) {

    // Returns null for anonymous callers (no token)
    public static CurrentUser from(Jwt jwt) {
        if (jwt == null) {
            return null;
        }
        List<String> roles = jwt.getClaimAsStringList("roles");
        return new CurrentUser(UUID.fromString(jwt.getSubject()), roles != null && roles.contains("ADMIN"));
    }
}