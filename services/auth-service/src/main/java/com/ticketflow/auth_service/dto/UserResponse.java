package com.ticketflow.auth_service.dto;

import com.ticketflow.auth_service.entity.Role;
import java.util.UUID;

public record UserResponse(UUID id, String email, String fullName, Role role) {
}