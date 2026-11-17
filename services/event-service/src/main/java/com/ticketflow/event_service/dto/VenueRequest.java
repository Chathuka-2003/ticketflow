package com.ticketflow.event_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VenueRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 100) String city,
        @Size(max = 255) String address,
        @Min(1) int capacity) {
}