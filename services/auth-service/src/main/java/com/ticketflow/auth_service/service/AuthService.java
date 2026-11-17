package com.ticketflow.auth_service.service;

import com.ticketflow.auth_service.dto.*;
import com.ticketflow.auth_service.entity.Role;
import com.ticketflow.auth_service.entity.User;
import com.ticketflow.auth_service.repository.UserRepository;
import com.ticketflow.auth_service.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder,
                       JwtService jwtService, RefreshTokenService refreshTokenService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        Role role = request.role() == null ? Role.USER : request.role();
        if (role == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This role cannot be self-assigned");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setRole(role);
        User saved = users.save(user);
        return new UserResponse(saved.getId(), saved.getEmail(), saved.getFullName(), saved.getRole());
    }

    public AuthResult login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = users.findByEmail(email)
                .filter(User::isEnabled)
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        return issueTokens(user, refreshTokenService.create(user));
    }

    public AuthResult refresh(String rawRefreshToken) {
        RefreshTokenService.Rotated rotated = refreshTokenService.rotate(rawRefreshToken);
        return issueTokens(rotated.user(), rotated.newRawToken());
    }

    public void logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    private AuthResult issueTokens(User user, String refreshToken) {
        AuthResponse body = new AuthResponse(
                jwtService.createAccessToken(user), "Bearer", JwtService.ACCESS_TOKEN_SECONDS);
        return new AuthResult(body, refreshToken);
    }
}