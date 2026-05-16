package com.ticketflow.booking_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record SeatSelectionItem(
        @NotBlank String label,
        @NotBlank String tierName,
        @NotNull @Positive BigDecimal price
) {
}
