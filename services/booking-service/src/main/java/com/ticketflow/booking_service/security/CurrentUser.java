package com.ticketflow.booking_service.security;

import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.UUID;

public record CurrentUser(UUID id, String email, boolean admin) {

    public static CurrentUser from(Jwt jwt) {
        if (jwt == null) {
            return null;
        }
        List<String> roles = jwt.getClaimAsStringList("roles");
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            email = "user@ticketflow.io";
        }
        return new CurrentUser(
                UUID.fromString(jwt.getSubject()),
                email,
                roles != null && roles.contains("ADMIN"));
    }
}
