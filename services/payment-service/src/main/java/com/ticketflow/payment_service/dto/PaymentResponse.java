package com.ticketflow.payment_service.dto;

import com.ticketflow.payment_service.entity.PaymentStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        UUID bookingId,
        String bookingReference,
        UUID userId,
        String userEmail,
        BigDecimal amount,
        String paymentMethod,
        PaymentStatus status,
        String idempotencyKey,
        String transactionRef,
        String createdAt
) {
}
