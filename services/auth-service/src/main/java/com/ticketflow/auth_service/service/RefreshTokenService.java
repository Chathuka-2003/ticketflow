package com.ticketflow.auth_service.service;

import com.ticketflow.auth_service.entity.RefreshToken;
import com.ticketflow.auth_service.entity.User;
import com.ticketflow.auth_service.repository.RefreshTokenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class RefreshTokenService {

    public static final long REFRESH_TOKEN_DAYS = 7;

    public record Rotated(User user, String newRawToken) {
    }

    private final RefreshTokenRepository repository;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public String create(User user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(hash(raw));
        token.setExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusDays(REFRESH_TOKEN_DAYS));
        repository.save(token);
        return raw;
    }

    // noRollbackFor: when we detect reuse we must keep the "revoke all" update even though we throw.
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public Rotated rotate(String rawToken) {
        RefreshToken existing = repository.findByTokenHash(hash(rawToken))
                .orElseThrow(this::unauthorized);

        if (existing.isRevoked()) {
            // An already-used token was presented again: possible theft, so end every session of this user.
            repository.revokeAllForUser(existing.getUser().getId());
            throw unauthorized();
        }
        if (existing.getExpiresAt().isBefore(LocalDateTime.now(ZoneOffset.UTC))
                || !existing.getUser().isEnabled()) {
            throw unauthorized();
        }

        existing.setRevoked(true);
        return new Rotated(existing.getUser(), create(existing.getUser()));
    }

    @Transactional
    public void revoke(String rawToken) {
        repository.findByTokenHash(hash(rawToken)).ifPresent(t -> t.setRevoked(true));
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
    }

    static String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}