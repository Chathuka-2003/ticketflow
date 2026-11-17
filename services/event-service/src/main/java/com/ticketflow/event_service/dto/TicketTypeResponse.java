package com.ticketflow.event_service.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record TicketTypeResponse(UUID id, String name, BigDecimal price, int quantity) {
}