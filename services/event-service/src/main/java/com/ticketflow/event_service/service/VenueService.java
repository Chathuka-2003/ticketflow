package com.ticketflow.event_service.service;

import com.ticketflow.event_service.dto.VenueRequest;
import com.ticketflow.event_service.dto.VenueResponse;
import com.ticketflow.event_service.entity.Venue;
import com.ticketflow.event_service.repository.VenueRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class VenueService {

    private final VenueRepository venues;

    public VenueService(VenueRepository venues) {
        this.venues = venues;
    }

    public List<VenueResponse> list() {
        return venues.findAll(Sort.by("city", "name")).stream().map(EventMapper::toVenue).toList();
    }

    @Transactional
    public VenueResponse create(VenueRequest request) {
        Venue venue = new Venue();
        venue.setName(request.name().trim());
        venue.setCity(request.city().trim());
        venue.setAddress(request.address());
        venue.setCapacity(request.capacity());
        return EventMapper.toVenue(venues.save(venue));
    }
}