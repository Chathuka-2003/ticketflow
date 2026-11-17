package com.ticketflow.auth_service.dto;

public record AuthResult(AuthResponse body, String refreshToken) {
}