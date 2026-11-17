package com.ticketflow.event_service.controller;

import com.ticketflow.event_service.dto.*;
import com.ticketflow.event_service.security.CurrentUser;
import com.ticketflow.event_service.service.EventService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public PageResponse<EventSummary> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return eventService.search(q, category, city, from, page, size);
    }

    @GetMapping("/mine")
    public PageResponse<EventSummary> mine(@AuthenticationPrincipal Jwt jwt,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        return eventService.mine(CurrentUser.from(jwt), page, size);
    }

    @GetMapping("/{id}")
    public EventDetail get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return eventService.get(id, CurrentUser.from(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventDetail create(@Valid @RequestBody EventRequest request, @AuthenticationPrincipal Jwt jwt) {
        return eventService.create(request, CurrentUser.from(jwt));
    }

    @PutMapping("/{id}")
    public EventDetail update(@PathVariable UUID id, @Valid @RequestBody EventUpdateRequest request,
                              @AuthenticationPrincipal Jwt jwt) {
        return eventService.update(id, request, CurrentUser.from(jwt));
    }

    @PostMapping("/{id}/publish")
    public EventDetail publish(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return eventService.publish(id, CurrentUser.from(jwt));
    }

    @PostMapping("/{id}/cancel")
    public EventDetail cancel(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return eventService.cancel(id, CurrentUser.from(jwt));
    }
}