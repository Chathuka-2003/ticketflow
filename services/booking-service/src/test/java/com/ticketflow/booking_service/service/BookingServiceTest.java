package com.ticketflow.booking_service.service;

import com.ticketflow.booking_service.dto.*;
import com.ticketflow.booking_service.entity.Booking;
import com.ticketflow.booking_service.entity.BookingStatus;
import com.ticketflow.booking_service.repository.BookingRepository;
import com.ticketflow.booking_service.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    BookingRepository bookingRepository;

    @Mock
    SeatLockService seatLockService;

    @Mock
    RabbitTemplate rabbitTemplate;

    @InjectMocks
    BookingService bookingService;

    private final UUID userId = UUID.randomUUID();
    private final CurrentUser user = new CurrentUser(userId, "attendee@ticketflow.io", false);
    private final CurrentUser stranger = new CurrentUser(UUID.randomUUID(), "other@ticketflow.io", false);
    private final CurrentUser admin = new CurrentUser(UUID.randomUUID(), "admin@ticketflow.io", true);

    @Test
    void createSeatHoldCalculatesTotalsAndLocksSeats() {
        UUID eventId = UUID.randomUUID();
        when(bookingRepository.findSeatLabelsByEventIdAndStatus(eventId, BookingStatus.CONFIRMED))
                .thenReturn(List.of());
        when(seatLockService.getHoldTtlSeconds()).thenReturn(600L);

        SeatHoldRequest req = new SeatHoldRequest(
                eventId,
                "Neon Pulse Tour",
                "2026-12-01T19:00:00",
                "Lotus Arena",
                "Colombo",
                "MUSIC",
                List.of(
                        new SeatSelectionItem("A1", "VIP", new BigDecimal("100.00")),
                        new SeatSelectionItem("A2", "VIP", new BigDecimal("100.00"))
                )
        );

        SeatHoldResponse res = bookingService.createSeatHold(req, user);

        assertNotNull(res.holdId());
        assertEquals(new BigDecimal("200.00"), res.totalAmount());
        assertEquals(new BigDecimal("16.00"), res.serviceFee());
        assertEquals(new BigDecimal("216.00"), res.grandTotal());
        verify(seatLockService).acquireHoldLocks(eq(eventId), eq(List.of("A1", "A2")), anyString(), eq(userId));
    }

    @Test
    void createSeatHoldRejectsAlreadySoldSeat() {
        UUID eventId = UUID.randomUUID();
        when(bookingRepository.findSeatLabelsByEventIdAndStatus(eventId, BookingStatus.CONFIRMED))
                .thenReturn(List.of("A1"));

        SeatHoldRequest req = new SeatHoldRequest(
                eventId,
                "Neon Pulse Tour",
                "2026-12-01T19:00:00",
                "Lotus Arena",
                "Colombo",
                "MUSIC",
                List.of(new SeatSelectionItem("A1", "VIP", new BigDecimal("100.00")))
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> bookingService.createSeatHold(req, user));

        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void checkoutIsIdempotentWhenKeyAlreadyExists() {
        UUID eventId = UUID.randomUUID();
        Booking existing = Booking.builder()
                .id(UUID.randomUUID())
                .bookingReference("TF-123456")
                .holdId("HOLD-ABC")
                .userId(userId)
                .userEmail("attendee@ticketflow.io")
                .eventId(eventId)
                .eventTitle("Neon Pulse")
                .eventCategory("MUSIC")
                .eventStartsAt("2026-12-01T19:00:00")
                .venueName("Lotus Arena")
                .city("Colombo")
                .totalAmount(new BigDecimal("100.00"))
                .serviceFee(new BigDecimal("8.00"))
                .grandTotal(new BigDecimal("108.00"))
                .status(BookingStatus.CONFIRMED)
                .idempotencyKey("idem-key-1")
                .paymentMethod("VISA 4242")
                .build();

        when(bookingRepository.findByIdempotencyKey("idem-key-1")).thenReturn(Optional.of(existing));

        CheckoutRequest req = new CheckoutRequest(
                "HOLD-ABC",
                eventId,
                "Neon Pulse",
                "MUSIC",
                "2026-12-01T19:00:00",
                "Lotus Arena",
                "Colombo",
                List.of(new SeatSelectionItem("A1", "VIP", new BigDecimal("100.00"))),
                "idem-key-1",
                "VISA 4242",
                false
        );

        BookingResponse res = bookingService.checkout(req, user);

        assertEquals("TF-123456", res.bookingReference());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void checkoutWithSimulatedFailureCompensatesAndReleasesLocks() {
        UUID eventId = UUID.randomUUID();
        when(bookingRepository.findByIdempotencyKey("idem-fail-1")).thenReturn(Optional.empty());
        when(bookingRepository.findSeatLabelsByEventIdAndStatus(eventId, BookingStatus.CONFIRMED))
                .thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        CheckoutRequest req = new CheckoutRequest(
                "HOLD-FAIL",
                eventId,
                "Neon Pulse",
                "MUSIC",
                "2026-12-01T19:00:00",
                "Lotus Arena",
                "Colombo",
                List.of(new SeatSelectionItem("B1", "Gold", new BigDecimal("75.00"))),
                "idem-fail-1",
                "VISA 4242",
                true
        );

        BookingResponse res = bookingService.checkout(req, user);

        assertEquals(BookingStatus.PAYMENT_FAILED, res.status());
        verify(seatLockService).releaseHoldLocks(eventId, List.of("B1"));
    }

    @Test
    void userCannotCancelAnotherUsersBooking() {
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .bookingReference("TF-999999")
                .holdId("HOLD-1")
                .userId(userId)
                .userEmail("attendee@ticketflow.io")
                .eventId(UUID.randomUUID())
                .eventTitle("Show")
                .eventCategory("MUSIC")
                .eventStartsAt("2026-12-01T19:00:00")
                .venueName("Arena")
                .city("Colombo")
                .totalAmount(new BigDecimal("50.00"))
                .serviceFee(new BigDecimal("4.00"))
                .grandTotal(new BigDecimal("54.00"))
                .status(BookingStatus.CONFIRMED)
                .idempotencyKey("key-99")
                .paymentMethod("VISA")
                .build();

        when(bookingRepository.findById(booking.getId())).thenReturn(Optional.of(booking));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> bookingService.cancelBooking(booking.getId(), stranger));

        assertEquals(403, ex.getStatusCode().value());
    }
}
