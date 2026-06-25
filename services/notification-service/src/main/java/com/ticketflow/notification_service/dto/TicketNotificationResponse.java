package com.ticketflow.notification_service.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record TicketNotificationResponse(
        UUID id,
        UUID bookingId,
        String bookingReference,
        UUID userId,
        String recipientEmail,
        String eventTitle,
        List<String> seats,
        BigDecimal grandTotal,
        String qrCodePayload,
        String subject,
        String status,
        String dispatchedAt
) {
}
