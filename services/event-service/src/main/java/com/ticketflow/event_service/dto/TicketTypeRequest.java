package com.ticketflow.event_service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record TicketTypeRequest(
        @NotBlank @Size(max = 80) String name,
        @NotNull @DecimalMin("0.00") BigDecimal price,
        @Min(1) int quantity) {
}