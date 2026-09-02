package com.ticketflow.payment_service.service;

import com.ticketflow.payment_service.dto.PaymentChargeRequest;
import com.ticketflow.payment_service.dto.PaymentResponse;
import com.ticketflow.payment_service.entity.Payment;
import com.ticketflow.payment_service.entity.PaymentStatus;
import com.ticketflow.payment_service.repository.PaymentRepository;
import com.ticketflow.payment_service.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    PaymentRepository paymentRepository;

    @InjectMocks
    PaymentService paymentService;

    private final UUID userId = UUID.randomUUID();
    private final CurrentUser user = new CurrentUser(userId, "attendee@ticketflow.io", false);

    @Test
    void processChargeReturnsExistingPaymentOnDuplicateIdempotencyKey() {
        UUID bookingId = UUID.randomUUID();
        Payment existing = Payment.builder()
                .id(UUID.randomUUID())
                .bookingId(bookingId)
                .bookingReference("TF-111111")
                .userId(userId)
                .userEmail("attendee@ticketflow.io")
                .amount(new BigDecimal("108.00"))
                .paymentMethod("VISA 4242")
                .status(PaymentStatus.COMPLETED)
                .idempotencyKey("idem-key-abc")
                .transactionRef("TXN-EXISTING")
                .build();

        when(paymentRepository.findByIdempotencyKey("idem-key-abc")).thenReturn(Optional.of(existing));

        PaymentChargeRequest req = new PaymentChargeRequest(
                bookingId,
                "TF-111111",
                new BigDecimal("108.00"),
                "VISA 4242",
                "idem-key-abc",
                false
        );

        PaymentResponse res = paymentService.processCharge(req, user);

        assertEquals("TXN-EXISTING", res.transactionRef());
        assertEquals(PaymentStatus.COMPLETED, res.status());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void processChargeRecordsCompletedPaymentWhenNew() {
        UUID bookingId = UUID.randomUUID();
        when(paymentRepository.findByIdempotencyKey("idem-new-1")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        PaymentChargeRequest req = new PaymentChargeRequest(
                bookingId,
                "TF-222222",
                new BigDecimal("216.00"),
                "VISA 4242",
                "idem-new-1",
                false
        );

        PaymentResponse res = paymentService.processCharge(req, user);

        assertEquals(PaymentStatus.COMPLETED, res.status());
        assertTrue(res.transactionRef().startsWith("TXN-"));
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    void processChargeRecordsFailedPaymentWhenSimulated() {
        UUID bookingId = UUID.randomUUID();
        when(paymentRepository.findByIdempotencyKey("idem-fail-1")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        PaymentChargeRequest req = new PaymentChargeRequest(
                bookingId,
                "TF-333333",
                new BigDecimal("81.00"),
                "VISA 4242",
                "idem-fail-1",
                true
        );

        PaymentResponse res = paymentService.processCharge(req, user);

        assertEquals(PaymentStatus.FAILED, res.status());
    }
}
