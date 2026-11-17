package com.ticketflow.event_service.dto;

import java.util.UUID;

public record VenueResponse(UUID id, String name, String city, String address, int capacity) {
}