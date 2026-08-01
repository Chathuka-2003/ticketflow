package com.ticketflow.payment_service.controller;

import com.ticketflow.payment_service.dto.PaymentChargeRequest;
import com.ticketflow.payment_service.dto.PaymentResponse;
import com.ticketflow.payment_service.security.CurrentUser;
import com.ticketflow.payment_service.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/charge")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse charge(
            @Valid @RequestBody PaymentChargeRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return paymentService.processCharge(request, CurrentUser.from(jwt));
    }

    @GetMapping("/mine")
    public List<PaymentResponse> getMyPayments(@AuthenticationPrincipal Jwt jwt) {
        return paymentService.getMyPayments(CurrentUser.from(jwt));
    }

    @GetMapping("/booking/{bookingId}")
    public PaymentResponse getByBookingId(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal Jwt jwt) {
        return paymentService.getByBookingId(bookingId, CurrentUser.from(jwt));
    }
}
