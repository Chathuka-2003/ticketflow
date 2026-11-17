package com.ticketflow.auth_service.service;

import com.ticketflow.auth_service.entity.RefreshToken;
import com.ticketflow.auth_service.entity.User;
import com.ticketflow.auth_service.repository.RefreshTokenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    RefreshTokenRepository repository;

    @InjectMocks
    RefreshTokenService service;

    private RefreshToken token(User user, boolean revoked, LocalDateTime expiresAt) {
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setRevoked(revoked);
        token.setExpiresAt(expiresAt);
        return token;
    }

    private User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEnabled(true);
        return user;
    }

    @Test
    void unknownTokenIsRejected() {
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> service.rotate("does-not-exist"));
    }

    @Test
    void reusedTokenRevokesEverySessionOfTheUser() {
        User user = user();
        when(repository.findByTokenHash(anyString()))
                .thenReturn(Optional.of(token(user, true, LocalDateTime.now().plusDays(1))));

        assertThrows(ResponseStatusException.class, () -> service.rotate("already-used"));

        verify(repository).revokeAllForUser(user.getId());
    }

    @Test
    void expiredTokenIsRejected() {
        User user = user();
        when(repository.findByTokenHash(anyString()))
                .thenReturn(Optional.of(token(user, false, LocalDateTime.now().minusDays(1))));

        assertThrows(ResponseStatusException.class, () -> service.rotate("expired"));

        verify(repository, never()).revokeAllForUser(any());
    }
}