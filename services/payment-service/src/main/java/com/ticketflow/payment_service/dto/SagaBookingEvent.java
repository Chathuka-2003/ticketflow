package com.ticketflow.payment_service.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SagaBookingEvent(
        UUID bookingId,
        String bookingReference,
        UUID userId,
        String userEmail,
        UUID eventId,
        String eventTitle,
        List<String> seatLabels,
        BigDecimal grandTotal,
        String idempotencyKey,
        String eventType,
        String timestamp
) {
}
