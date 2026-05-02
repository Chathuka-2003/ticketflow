package com.ticketflow.booking_service.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SeatHoldResponse(
        String holdId,
        String redisKey,
        UUID eventId,
        String eventTitle,
        String eventStartsAt,
        String venueName,
        String city,
        String category,
        List<SeatSelectionItem> seats,
        BigDecimal totalAmount,
        BigDecimal serviceFee,
        BigDecimal grandTotal,
        long createdAt,
        long expiresAt,
        long ttlSeconds,
        String idempotencyKey
) {
}
