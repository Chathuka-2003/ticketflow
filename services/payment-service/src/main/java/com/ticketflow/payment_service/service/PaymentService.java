package com.ticketflow.payment_service.service;

import com.ticketflow.payment_service.dto.PaymentChargeRequest;
import com.ticketflow.payment_service.dto.PaymentResponse;
import com.ticketflow.payment_service.dto.SagaBookingEvent;
import com.ticketflow.payment_service.entity.Payment;
import com.ticketflow.payment_service.entity.PaymentStatus;
import com.ticketflow.payment_service.repository.PaymentRepository;
import com.ticketflow.payment_service.security.CurrentUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public PaymentResponse processCharge(PaymentChargeRequest req, CurrentUser user) {
        Optional<Payment> existing = paymentRepository.findByIdempotencyKey(req.idempotencyKey());
        if (existing.isPresent()) {
            log.info("Idempotent replay detected for key={}, returning cached payment={}",
                    req.idempotencyKey(), existing.get().getTransactionRef());
            return toResponse(existing.get());
        }

        PaymentStatus status = req.simulateFailure() ? PaymentStatus.FAILED : PaymentStatus.COMPLETED;
        String txRef = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Payment payment = Payment.builder()
                .bookingId(req.bookingId())
                .bookingReference(req.bookingReference())
                .userId(user.id())
                .userEmail(user.email())
                .amount(req.amount())
                .paymentMethod(req.paymentMethod())
                .status(status)
                .idempotencyKey(req.idempotencyKey())
                .transactionRef(txRef)
                .build();

        Payment saved = paymentRepository.save(payment);
        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse recordSagaBookingPayment(SagaBookingEvent event) {
        Optional<Payment> existing = paymentRepository.findByIdempotencyKey(event.idempotencyKey());
        if (existing.isPresent()) {
            return toResponse(existing.get());
        }

        String txRef = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Payment payment = Payment.builder()
                .bookingId(event.bookingId())
                .bookingReference(event.bookingReference())
                .userId(event.userId())
                .userEmail(event.userEmail())
                .amount(event.grandTotal())
                .paymentMethod("VISA •••• 4242")
                .status(PaymentStatus.COMPLETED)
                .idempotencyKey(event.idempotencyKey())
                .transactionRef(txRef)
                .build();

        Payment saved = paymentRepository.save(payment);
        log.info("Recorded Saga payment {} for booking {}", saved.getTransactionRef(), event.bookingReference());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getMyPayments(CurrentUser user) {
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(user.id()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentResponse getByBookingId(UUID bookingId, CurrentUser user) {
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        if (!user.admin() && !payment.getUserId().equals(user.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to view this payment");
        }
        return toResponse(payment);
    }

    private PaymentResponse toResponse(Payment p) {
        return new PaymentResponse(
                p.getId(),
                p.getBookingId(),
                p.getBookingReference(),
                p.getUserId(),
                p.getUserEmail(),
                p.getAmount(),
                p.getPaymentMethod(),
                p.getStatus(),
                p.getIdempotencyKey(),
                p.getTransactionRef(),
                p.getCreatedAt() != null ? p.getCreatedAt().toString() : Instant.now().toString());
    }
}
