package com.ticketflow.payment_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record StripeWebhookPayload(
        @NotBlank String eventId,
        @NotBlank String type,
        @NotNull UUID bookingId,
        @NotBlank String bookingReference,
        @NotNull UUID userId,
        @NotBlank String userEmail,
        @NotNull @Positive BigDecimal amount,
        @NotBlank String idempotencyKey
) {
}
