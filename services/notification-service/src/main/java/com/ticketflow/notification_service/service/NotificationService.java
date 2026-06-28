package com.ticketflow.notification_service.service;

import com.ticketflow.notification_service.dto.SagaBookingEvent;
import com.ticketflow.notification_service.dto.TicketNotificationResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Deque;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final int MAX_RECENT_NOTIFICATIONS = 200;

    private final Deque<TicketNotificationResponse> dispatches = new ConcurrentLinkedDeque<>();

    public TicketNotificationResponse handlePaymentCompleted(SagaBookingEvent event) {
        String qrPayload = "TF-QR-" + event.bookingReference() + "-" + event.bookingId();
        String subject = "Your TicketFlow Pass for " + event.eventTitle() + " (" + event.bookingReference() + ")";

        TicketNotificationResponse notification = new TicketNotificationResponse(
                UUID.randomUUID(),
                event.bookingId(),
                event.bookingReference(),
                event.userId(),
                event.userEmail(),
                event.eventTitle(),
                event.seatLabels(),
                event.grandTotal(),
                qrPayload,
                subject,
                "SENT",
                Instant.now().toString());

        recordDispatch(notification);
        log.info("Dispatched QR Ticket Email to {} for booking {} [qr={}]",
                event.userEmail(), event.bookingReference(), qrPayload);
        return notification;
    }

    public TicketNotificationResponse handlePaymentFailed(SagaBookingEvent event) {
        String subject = "Payment Declined — Seats Released for " + event.eventTitle() + " (" + event.bookingReference() + ")";

        TicketNotificationResponse notification = new TicketNotificationResponse(
                UUID.randomUUID(),
                event.bookingId(),
                event.bookingReference(),
                event.userId(),
                event.userEmail(),
                event.eventTitle(),
                event.seatLabels(),
                event.grandTotal(),
                "NONE",
                subject,
                "COMPENSATION_ALERT_SENT",
                Instant.now().toString());

        recordDispatch(notification);
        log.info("Dispatched Saga Compensation Alert to {} for booking {}",
                event.userEmail(), event.bookingReference());
        return notification;
    }

    public List<TicketNotificationResponse> getNotificationsForUser(UUID userId) {
        return dispatches.stream()
                .filter(n -> userId.equals(n.userId()))
                .toList();
    }

    private void recordDispatch(TicketNotificationResponse item) {
        dispatches.addFirst(item);
        while (dispatches.size() > MAX_RECENT_NOTIFICATIONS) {
            dispatches.removeLast();
        }
    }
}
