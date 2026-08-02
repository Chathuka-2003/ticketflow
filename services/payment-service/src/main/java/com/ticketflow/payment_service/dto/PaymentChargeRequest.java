package com.ticketflow.payment_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentChargeRequest(
        @NotNull UUID bookingId,
        @NotBlank String bookingReference,
        @NotNull @Positive BigDecimal amount,
        @NotBlank String paymentMethod,
        @NotBlank String idempotencyKey,
        boolean simulateFailure
) {
}
