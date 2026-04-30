package com.ticketflow.booking_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record SeatHoldRequest(
        @NotNull UUID eventId,
        @NotBlank String eventTitle,
        @NotBlank String eventStartsAt,
        @NotBlank String venueName,
        @NotBlank String city,
        @NotBlank String category,
        @NotEmpty @Valid List<SeatSelectionItem> seats
) {
}
