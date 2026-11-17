package com.ticketflow.event_service.service;

import com.ticketflow.event_service.dto.*;
import com.ticketflow.event_service.entity.Event;
import com.ticketflow.event_service.entity.TicketType;
import com.ticketflow.event_service.entity.Venue;

import java.util.Comparator;

public final class EventMapper {

    private EventMapper() {
    }

    public static VenueResponse toVenue(Venue venue) {
        return new VenueResponse(venue.getId(), venue.getName(), venue.getCity(),
                venue.getAddress(), venue.getCapacity());
    }

    public static EventSummary toSummary(Event event) {
        return new EventSummary(event.getId(), event.getTitle(), event.getCategory(),
                event.getStartsAt(), event.getEndsAt(), event.getStatus(),
                event.getVenue().getName(), event.getVenue().getCity());
    }

    public static EventDetail toDetail(Event event) {
        return new EventDetail(event.getId(), event.getOrganizerId(), event.getTitle(),
                event.getDescription(), event.getCategory(), event.getStartsAt(), event.getEndsAt(),
                event.getStatus(), toVenue(event.getVenue()),
                event.getTicketTypes().stream()
                        .sorted(Comparator.comparing(TicketType::getPrice))
                        .map(t -> new TicketTypeResponse(t.getId(), t.getName(), t.getPrice(), t.getQuantity()))
                        .toList());
    }
}