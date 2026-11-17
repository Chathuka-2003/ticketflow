package com.ticketflow.event_service.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

public record EventUpdateRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 5000) String description,
        @NotBlank @Size(max = 50) String category,
        @NotNull UUID venueId,
        @NotNull @Future LocalDateTime startsAt,
        @NotNull LocalDateTime endsAt) {
}