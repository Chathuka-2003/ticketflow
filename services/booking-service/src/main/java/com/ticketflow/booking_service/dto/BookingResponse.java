package com.ticketflow.booking_service.dto;

import com.ticketflow.booking_service.entity.BookingStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record BookingResponse(
        UUID id,
        String bookingReference,
        String holdId,
        UUID userId,
        String userEmail,
        UUID eventId,
        String eventTitle,
        String eventCategory,
        String eventStartsAt,
        String venueName,
        String city,
        List<SeatSelectionItem> seats,
        BigDecimal totalAmount,
        BigDecimal serviceFee,
        BigDecimal grandTotal,
        BookingStatus status,
        String idempotencyKey,
        String paymentMethod,
        String createdAt
) {
}
