package com.ticketflow.booking_service.service;

import com.ticketflow.booking_service.config.RabbitMqConfig;
import com.ticketflow.booking_service.dto.*;
import com.ticketflow.booking_service.entity.Booking;
import com.ticketflow.booking_service.entity.BookingSeat;
import com.ticketflow.booking_service.entity.BookingStatus;
import com.ticketflow.booking_service.repository.BookingRepository;
import com.ticketflow.booking_service.security.CurrentUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    private static final BigDecimal SERVICE_FEE_RATE = new BigDecimal("0.08");

    private final BookingRepository bookingRepository;
    private final SeatLockService seatLockService;
    private final RabbitTemplate rabbitTemplate;

    public BookingService(
            BookingRepository bookingRepository,
            SeatLockService seatLockService,
            RabbitTemplate rabbitTemplate) {
        this.bookingRepository = bookingRepository;
        this.seatLockService = seatLockService;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional(readOnly = true)
    public EventSeatStateResponse getEventSeatState(UUID eventId) {
        List<String> soldSeats = bookingRepository.findSeatLabelsByEventIdAndStatus(eventId, BookingStatus.CONFIRMED);
        Set<String> soldSet = new HashSet<>(soldSeats);
        List<String> heldSeats = seatLockService.getHeldSeatLabels(eventId).stream()
                .filter(label -> !soldSet.contains(label))
                .toList();
        return new EventSeatStateResponse(eventId, heldSeats, soldSeats);
    }

    @Transactional(readOnly = true)
    public SeatHoldResponse createSeatHold(SeatHoldRequest req, CurrentUser user) {
        if (req.seats().size() > 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum 8 seats allowed per hold");
        }

        List<String> requestedLabels = req.seats().stream()
                .map(SeatSelectionItem::label)
                .toList();

        List<String> soldSeats = bookingRepository.findSeatLabelsByEventIdAndStatus(
                req.eventId(), BookingStatus.CONFIRMED);
        for (String label : requestedLabels) {
            if (soldSeats.contains(label)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Seat " + label + " is already sold");
            }
        }

        String holdId = "HOLD-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        seatLockService.acquireHoldLocks(req.eventId(), requestedLabels, holdId, user.id());

        BigDecimal totalAmount = req.seats().stream()
                .map(SeatSelectionItem::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal serviceFee = totalAmount.multiply(SERVICE_FEE_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal grandTotal = totalAmount.add(serviceFee).setScale(2, RoundingMode.HALF_UP);

        long nowMs = System.currentTimeMillis();
        long ttlSeconds = seatLockService.getHoldTtlSeconds();
        long expiresAtMs = nowMs + (ttlSeconds * 1000L);
        String redisKey = "seat:lock:" + req.eventId() + ":[" + String.join(",", requestedLabels) + "]";

        return new SeatHoldResponse(
                holdId,
                redisKey,
                req.eventId(),
                req.eventTitle(),
                req.eventStartsAt(),
                req.venueName(),
                req.city(),
                req.category(),
                req.seats(),
                totalAmount,
                serviceFee,
                grandTotal,
                nowMs,
                expiresAtMs,
                ttlSeconds,
                UUID.randomUUID().toString());
    }

    public void releaseSeatHold(UUID eventId, List<String> seatLabels) {
        seatLockService.releaseHoldLocks(eventId, seatLabels);
    }

    @Transactional
    public BookingResponse checkout(CheckoutRequest req, CurrentUser user) {
        Optional<Booking> existing = bookingRepository.findByIdempotencyKey(req.idempotencyKey());
        if (existing.isPresent()) {
            return toResponse(existing.get());
        }

        List<String> requestedLabels = req.seats().stream()
                .map(SeatSelectionItem::label)
                .toList();

        List<String> soldSeats = bookingRepository.findSeatLabelsByEventIdAndStatus(
                req.eventId(), BookingStatus.CONFIRMED);
        for (String label : requestedLabels) {
            if (soldSeats.contains(label)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Seat " + label + " is already sold");
            }
        }

        BigDecimal totalAmount = req.seats().stream()
                .map(SeatSelectionItem::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal serviceFee = totalAmount.multiply(SERVICE_FEE_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal grandTotal = totalAmount.add(serviceFee).setScale(2, RoundingMode.HALF_UP);

        BookingStatus finalStatus = req.simulatePaymentFailure()
                ? BookingStatus.PAYMENT_FAILED
                : BookingStatus.CONFIRMED;

        String reference = "TF-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        Booking booking = Booking.builder()
                .bookingReference(reference)
                .holdId(req.holdId())
                .userId(user.id())
                .userEmail(user.email())
                .eventId(req.eventId())
                .eventTitle(req.eventTitle())
                .eventCategory(req.eventCategory())
                .eventStartsAt(req.eventStartsAt())
                .venueName(req.venueName())
                .city(req.city())
                .totalAmount(totalAmount)
                .serviceFee(serviceFee)
                .grandTotal(grandTotal)
                .status(finalStatus)
                .idempotencyKey(req.idempotencyKey())
                .paymentMethod(req.paymentMethod())
                .build();

        for (SeatSelectionItem item : req.seats()) {
            BookingSeat seat = BookingSeat.builder()
                    .booking(booking)
                    .seatLabel(item.label())
                    .tierName(item.tierName())
                    .price(item.price())
                    .build();
            booking.getSeats().add(seat);
        }

        Booking saved = bookingRepository.save(booking);

        // Release temporary Redis hold keys whether confirmed (now persisted in DB) or compensated
        seatLockService.releaseHoldLocks(req.eventId(), requestedLabels);

        publishSagaEvents(saved, requestedLabels, req.simulatePaymentFailure());

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(CurrentUser user) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(user.id()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public BookingResponse cancelBooking(UUID bookingId, CurrentUser user) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (!user.admin() && !booking.getUserId().equals(user.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to cancel another user's booking");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        Booking saved = bookingRepository.save(booking);
        return toResponse(saved);
    }

    private void publishSagaEvents(Booking booking, List<String> seatLabels, boolean paymentFailed) {
        try {
            SagaBookingEvent createdEvent = new SagaBookingEvent(
                    booking.getId(),
                    booking.getBookingReference(),
                    booking.getUserId(),
                    booking.getUserEmail(),
                    booking.getEventId(),
                    booking.getEventTitle(),
                    seatLabels,
                    booking.getGrandTotal(),
                    booking.getIdempotencyKey(),
                    "BookingCreated",
                    Instant.now().toString());
            rabbitTemplate.convertAndSend(
                    RabbitMqConfig.SAGA_EXCHANGE,
                    RabbitMqConfig.ROUTING_BOOKING_CREATED,
                    createdEvent);

            String outcomeType = paymentFailed ? "PaymentFailed" : "PaymentCompleted";
            String outcomeRouting = paymentFailed
                    ? RabbitMqConfig.ROUTING_PAYMENT_FAILED
                    : RabbitMqConfig.ROUTING_PAYMENT_COMPLETED;

            SagaBookingEvent outcomeEvent = new SagaBookingEvent(
                    booking.getId(),
                    booking.getBookingReference(),
                    booking.getUserId(),
                    booking.getUserEmail(),
                    booking.getEventId(),
                    booking.getEventTitle(),
                    seatLabels,
                    booking.getGrandTotal(),
                    booking.getIdempotencyKey(),
                    outcomeType,
                    Instant.now().toString());
            rabbitTemplate.convertAndSend(
                    RabbitMqConfig.SAGA_EXCHANGE,
                    outcomeRouting,
                    outcomeEvent);
        } catch (Exception ex) {
            log.warn("RabbitMQ Saga event publish skipped or failed: {}", ex.getMessage());
        }
    }

    private BookingResponse toResponse(Booking b) {
        List<SeatSelectionItem> seatItems = b.getSeats().stream()
                .map(s -> new SeatSelectionItem(s.getSeatLabel(), s.getTierName(), s.getPrice()))
                .toList();
        return new BookingResponse(
                b.getId(),
                b.getBookingReference(),
                b.getHoldId(),
                b.getUserId(),
                b.getUserEmail(),
                b.getEventId(),
                b.getEventTitle(),
                b.getEventCategory(),
                b.getEventStartsAt(),
                b.getVenueName(),
                b.getCity(),
                seatItems,
                b.getTotalAmount(),
                b.getServiceFee(),
                b.getGrandTotal(),
                b.getStatus(),
                b.getIdempotencyKey(),
                b.getPaymentMethod(),
                b.getCreatedAt() != null ? b.getCreatedAt().toString() : Instant.now().toString());
    }
}
