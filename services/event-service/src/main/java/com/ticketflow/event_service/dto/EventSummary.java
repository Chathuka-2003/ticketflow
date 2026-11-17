package com.ticketflow.event_service.dto;

import com.ticketflow.event_service.entity.EventStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record EventSummary(
        UUID id,
        String title,
        String category,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        EventStatus status,
        String venueName,
        String city) {
}