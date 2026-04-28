package com.ticketflow.booking_service.dto;

import java.util.List;
import java.util.UUID;

public record EventSeatStateResponse(
        UUID eventId,
        List<String> heldSeats,
        List<String> soldSeats
) {
}
