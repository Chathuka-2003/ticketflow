package com.ticketflow.payment_service.repository;

import com.ticketflow.payment_service.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    Optional<Payment> findByBookingId(UUID bookingId);

    List<Payment> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
