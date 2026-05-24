package com.ticketflow.booking_service.repository;

import com.ticketflow.booking_service.entity.Booking;
import com.ticketflow.booking_service.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Booking> findByIdempotencyKey(String idempotencyKey);

    @Query("SELECT bs.seatLabel FROM Booking b JOIN b.seats bs WHERE b.eventId = :eventId AND b.status = :status")
    List<String> findSeatLabelsByEventIdAndStatus(
            @Param("eventId") UUID eventId,
            @Param("status") BookingStatus status);
}
