package com.ticketflow.auth_service.security;

import com.nimbusds.jose.jwk.RSAKey;
import com.ticketflow.auth_service.entity.Role;
import com.ticketflow.auth_service.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtServiceTest {

    private RSAKey key;
    private JwtEncoder encoder;
    private JwtDecoder decoder;
    private JwtService service;

    @BeforeEach
    void setUp() throws Exception {
        JwtConfig config = new JwtConfig();
        key = config.rsaKey();
        encoder = config.jwtEncoder(key);
        decoder = config.jwtDecoder(key);
        service = new JwtService(encoder, key);
    }

    private User user(Role role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("test@example.com");
        user.setRole(role);
        return user;
    }

    @Test
    void validTokenCarriesExpectedClaims() {
        User user = user(Role.ORGANIZER);
        Jwt jwt = decoder.decode(service.createAccessToken(user));

        assertEquals(user.getId().toString(), jwt.getSubject());
        assertEquals("test@example.com", jwt.getClaimAsString("email"));
        assertEquals(List.of("ORGANIZER"), jwt.getClaimAsStringList("roles"));
        assertEquals("ticketflow-auth", jwt.getClaimAsString("iss"));
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() throws Exception {
        JwtConfig otherConfig = new JwtConfig();
        RSAKey otherKey = otherConfig.rsaKey();
        JwtService attacker = new JwtService(otherConfig.jwtEncoder(otherKey), otherKey);

        String forged = attacker.createAccessToken(user(Role.ADMIN));

        assertThrows(JwtException.class, () -> decoder.decode(forged));
    }

    @Test
    void tamperedPayloadIsRejected() {
        String token = service.createAccessToken(user(Role.USER));
        String[] parts = token.split("\\.");
        String evilPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(
                "{\"sub\":\"x\",\"roles\":[\"ADMIN\"]}".getBytes(StandardCharsets.UTF_8));
        String tampered = parts[0] + "." + evilPayload + "." + parts[2];

        assertThrows(JwtException.class, () -> decoder.decode(tampered));
    }

    @Test
    void expiredTokenIsRejected() {
        Instant past = Instant.now().minusSeconds(600);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("ticketflow-auth")
                .subject("someone")
                .issuedAt(past.minusSeconds(900))
                .expiresAt(past)
                .build();
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(key.getKeyID()).build();
        String expired = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();

        assertThrows(JwtException.class, () -> decoder.decode(expired));
    }
}