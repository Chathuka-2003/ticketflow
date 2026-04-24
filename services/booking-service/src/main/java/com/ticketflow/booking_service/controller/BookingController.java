package com.ticketflow.booking_service.controller;

import com.ticketflow.booking_service.dto.*;
import com.ticketflow.booking_service.security.CurrentUser;
import com.ticketflow.booking_service.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping("/events/{eventId}/seats")
    public EventSeatStateResponse getEventSeatState(@PathVariable UUID eventId) {
        return bookingService.getEventSeatState(eventId);
    }

    @PostMapping("/hold")
    @ResponseStatus(HttpStatus.CREATED)
    public SeatHoldResponse createSeatHold(
            @Valid @RequestBody SeatHoldRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return bookingService.createSeatHold(request, CurrentUser.from(jwt));
    }

    @DeleteMapping("/hold/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void releaseSeatHold(
            @PathVariable UUID eventId,
            @RequestParam("seats") List<String> seats) {
        bookingService.releaseSeatHold(eventId, seats);
    }

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse checkout(
            @Valid @RequestBody CheckoutRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return bookingService.checkout(request, CurrentUser.from(jwt));
    }

    @GetMapping("/mine")
    public List<BookingResponse> getMyBookings(@AuthenticationPrincipal Jwt jwt) {
        return bookingService.getMyBookings(CurrentUser.from(jwt));
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancelBooking(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return bookingService.cancelBooking(id, CurrentUser.from(jwt));
    }
}
