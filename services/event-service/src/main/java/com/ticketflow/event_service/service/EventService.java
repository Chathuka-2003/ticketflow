package com.ticketflow.event_service.service;

import com.ticketflow.event_service.dto.*;
import com.ticketflow.event_service.entity.Event;
import com.ticketflow.event_service.entity.EventStatus;
import com.ticketflow.event_service.entity.TicketType;
import com.ticketflow.event_service.entity.Venue;
import com.ticketflow.event_service.repository.EventRepository;
import com.ticketflow.event_service.repository.VenueRepository;
import com.ticketflow.event_service.security.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class EventService {

    private static final int MAX_PAGE_SIZE = 50;

    private final EventRepository events;
    private final VenueRepository venues;

    public EventService(EventRepository events, VenueRepository venues) {
        this.events = events;
        this.venues = venues;
    }

    // ---------- reads ----------

    public PageResponse<EventSummary> search(String q, String category, String city,
                                             LocalDateTime from, int page, int size) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        Specification<Event> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), EventStatus.PUBLISHED));
            if (StringUtils.hasText(q)) {
                predicates.add(cb.like(cb.lower(root.<String>get("title")), "%" + q.trim().toLowerCase() + "%"));
            }
            if (StringUtils.hasText(category)) {
                predicates.add(cb.equal(cb.lower(root.<String>get("category")), category.trim().toLowerCase()));
            }
            if (StringUtils.hasText(city)) {
                predicates.add(cb.equal(cb.lower(root.get("venue").<String>get("city")), city.trim().toLowerCase()));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("startsAt"), from));
            } else {
                predicates.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("endsAt"), now));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<Event> result = events.findAll(spec, pageRequest(page, size, Sort.by("startsAt")));
        return PageResponse.of(result.map(EventMapper::toSummary));
    }

    public PageResponse<EventSummary> mine(CurrentUser user, int page, int size) {
        Page<Event> result = events.findByOrganizerId(user.id(),
                pageRequest(page, size, Sort.by("startsAt").descending()));
        return PageResponse.of(result.map(EventMapper::toSummary));
    }

    // user is null for anonymous callers
    public EventDetail get(UUID id, CurrentUser user) {
        Event event = load(id);
        if (event.getStatus() != EventStatus.PUBLISHED && !canManage(event, user)) {
            throw notFound();   // drafts and cancelled events are invisible to the public
        }
        return EventMapper.toDetail(event);
    }

    // ---------- writes ----------

    @Transactional
    public EventDetail create(EventRequest request, CurrentUser user) {
        validateDates(request.startsAt(), request.endsAt());
        Venue venue = venues.findById(request.venueId())
                .orElseThrow(() -> badRequest("Venue not found"));

        Set<String> names = new HashSet<>();
        int totalTickets = 0;
        for (TicketTypeRequest tier : request.ticketTypes()) {
            if (!names.add(tier.name().trim().toLowerCase())) {
                throw badRequest("Duplicate ticket type: " + tier.name());
            }
            totalTickets += tier.quantity();
        }
        checkCapacity(venue, totalTickets);

        Event event = new Event();
        event.setOrganizerId(user.id());
        event.setVenue(venue);
        event.setTitle(request.title().trim());
        event.setDescription(request.description());
        event.setCategory(request.category().trim());
        event.setStartsAt(request.startsAt());
        event.setEndsAt(request.endsAt());
        event.setStatus(EventStatus.DRAFT);
        for (TicketTypeRequest tier : request.ticketTypes()) {
            TicketType type = new TicketType();
            type.setEvent(event);
            type.setName(tier.name().trim());
            type.setPrice(tier.price());
            type.setQuantity(tier.quantity());
            event.getTicketTypes().add(type);
        }
        return EventMapper.toDetail(events.save(event));
    }

    @Transactional
    public EventDetail update(UUID id, EventUpdateRequest request, CurrentUser user) {
        Event event = loadManageable(id, user);
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw conflict("Cancelled events cannot be edited");
        }
        validateDates(request.startsAt(), request.endsAt());
        Venue venue = venues.findById(request.venueId())
                .orElseThrow(() -> badRequest("Venue not found"));
        int totalTickets = event.getTicketTypes().stream().mapToInt(TicketType::getQuantity).sum();
        checkCapacity(venue, totalTickets);

        event.setVenue(venue);
        event.setTitle(request.title().trim());
        event.setDescription(request.description());
        event.setCategory(request.category().trim());
        event.setStartsAt(request.startsAt());
        event.setEndsAt(request.endsAt());
        return EventMapper.toDetail(event);   // changes are flushed when the transaction commits
    }

    @Transactional
    public EventDetail publish(UUID id, CurrentUser user) {
        Event event = loadManageable(id, user);
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw conflict("Cancelled events cannot be published");
        }
        event.setStatus(EventStatus.PUBLISHED);
        return EventMapper.toDetail(event);
    }

    @Transactional
    public EventDetail cancel(UUID id, CurrentUser user) {
        Event event = loadManageable(id, user);
        event.setStatus(EventStatus.CANCELLED);
        return EventMapper.toDetail(event);
    }

    // ---------- helpers ----------

    private Event load(UUID id) {
        return events.findWithDetailsById(id).orElseThrow(EventService::notFound);
    }

    private Event loadManageable(UUID id, CurrentUser user) {
        Event event = load(id);
        if (!canManage(event, user)) {
            throw event.getStatus() == EventStatus.PUBLISHED
                    ? new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this event")
                    : notFound();
        }
        return event;
    }

    private boolean canManage(Event event, CurrentUser user) {
        return user != null && (user.admin() || event.getOrganizerId().equals(user.id()));
    }

    private void validateDates(LocalDateTime startsAt, LocalDateTime endsAt) {
        if (!endsAt.isAfter(startsAt)) {
            throw badRequest("End time must be after start time");
        }
    }

    private void checkCapacity(Venue venue, int totalTickets) {
        if (totalTickets > venue.getCapacity()) {
            throw badRequest("Total tickets (" + totalTickets + ") exceed venue capacity (" + venue.getCapacity() + ")");
        }
    }

    private PageRequest pageRequest(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), sort);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}