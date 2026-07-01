package com.ticketflow.notification_service.service;

import com.ticketflow.notification_service.dto.SagaBookingEvent;
import com.ticketflow.notification_service.dto.TicketNotificationResponse;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class NotificationServiceTest {

    private final NotificationService service = new NotificationService();

    @Test
    void handlePaymentCompletedGeneratesQrPassAndStoresNotification() {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        SagaBookingEvent event = new SagaBookingEvent(
                bookingId,
                "TF-777888",
                userId,
                "attendee@ticketflow.io",
                UUID.randomUUID(),
                "Neon Pulse Tour",
                List.of("A1", "A2"),
                new BigDecimal("216.00"),
                "idem-1",
                "PaymentCompleted",
                "2026-11-18T00:00:00Z"
        );

        TicketNotificationResponse res = service.handlePaymentCompleted(event);

        assertEquals("SENT", res.status());
        assertTrue(res.qrCodePayload().startsWith("TF-QR-TF-777888-"));
        assertEquals(1, service.getNotificationsForUser(userId).size());
    }

    @Test
    void handlePaymentFailedGeneratesCompensationAlert() {
        UUID userId = UUID.randomUUID();
        SagaBookingEvent event = new SagaBookingEvent(
                UUID.randomUUID(),
                "TF-999000",
                userId,
                "attendee@ticketflow.io",
                UUID.randomUUID(),
                "Neon Pulse Tour",
                List.of("B1"),
                new BigDecimal("81.00"),
                "idem-2",
                "PaymentFailed",
                "2026-11-18T00:00:00Z"
        );

        TicketNotificationResponse res = service.handlePaymentFailed(event);

        assertEquals("COMPENSATION_ALERT_SENT", res.status());
        assertEquals("NONE", res.qrCodePayload());
        assertEquals(1, service.getNotificationsForUser(userId).size());
    }
}
