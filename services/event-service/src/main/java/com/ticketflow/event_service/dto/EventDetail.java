package com.ticketflow.event_service.dto;

import com.ticketflow.event_service.entity.EventStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record EventDetail(
        UUID id,
        UUID organizerId,
        String title,
        String description,
        String category,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        EventStatus status,
        VenueResponse venue,
        List<TicketTypeResponse> ticketTypes) {
}