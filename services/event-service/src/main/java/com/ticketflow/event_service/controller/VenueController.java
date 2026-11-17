package com.ticketflow.event_service.controller;

import com.ticketflow.event_service.dto.VenueRequest;
import com.ticketflow.event_service.dto.VenueResponse;
import com.ticketflow.event_service.service.VenueService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/venues")
public class VenueController {

    private final VenueService venueService;

    public VenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    @GetMapping
    public List<VenueResponse> list() {
        return venueService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VenueResponse create(@Valid @RequestBody VenueRequest request) {
        return venueService.create(request);
    }
}