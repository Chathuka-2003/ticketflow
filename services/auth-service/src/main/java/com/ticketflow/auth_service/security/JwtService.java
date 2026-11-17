package com.ticketflow.auth_service.security;

import com.nimbusds.jose.jwk.RSAKey;
import com.ticketflow.auth_service.entity.User;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class JwtService {

    public static final long ACCESS_TOKEN_SECONDS = 900; // 15 minutes

    private final JwtEncoder encoder;
    private final RSAKey rsaKey;

    public JwtService(JwtEncoder encoder, RSAKey rsaKey) {
        this.encoder = encoder;
        this.rsaKey = rsaKey;
    }

    public String createAccessToken(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("ticketflow-auth")
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(ACCESS_TOKEN_SECONDS))
                .id(UUID.randomUUID().toString())
                .claim("email", user.getEmail())
                .claim("roles", List.of(user.getRole().name()))
                .build();
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256)
                .keyId(rsaKey.getKeyID())
                .build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}