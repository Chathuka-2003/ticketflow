package com.ticketflow.event_service.service;

import com.ticketflow.event_service.dto.EventDetail;
import com.ticketflow.event_service.dto.EventRequest;
import com.ticketflow.event_service.dto.TicketTypeRequest;
import com.ticketflow.event_service.entity.Event;
import com.ticketflow.event_service.entity.EventStatus;
import com.ticketflow.event_service.entity.Venue;
import com.ticketflow.event_service.repository.EventRepository;
import com.ticketflow.event_service.repository.VenueRepository;
import com.ticketflow.event_service.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock
    EventRepository events;

    @Mock
    VenueRepository venues;

    @InjectMocks
    EventService service;

    private final UUID ownerId = UUID.randomUUID();
    private final CurrentUser owner = new CurrentUser(ownerId, false);
    private final CurrentUser stranger = new CurrentUser(UUID.randomUUID(), false);
    private final CurrentUser admin = new CurrentUser(UUID.randomUUID(), true);

    private Venue venue(int capacity) {
        Venue venue = new Venue();
        venue.setId(UUID.randomUUID());
        venue.setName("Test Hall");
        venue.setCity("Colombo");
        venue.setCapacity(capacity);
        return venue;
    }

    private Event event(EventStatus status) {
        Event event = new Event();
        event.setId(UUID.randomUUID());
        event.setOrganizerId(ownerId);
        event.setVenue(venue(500));
        event.setTitle("Test event");
        event.setCategory("MUSIC");
        event.setStartsAt(LocalDateTime.now().plusDays(10));
        event.setEndsAt(LocalDateTime.now().plusDays(10).plusHours(3));
        event.setStatus(status);
        return event;
    }

    private EventRequest request(UUID venueId, LocalDateTime start, LocalDateTime end, int... quantities) {
        List<TicketTypeRequest> tiers = new java.util.ArrayList<>();
        for (int i = 0; i < quantities.length; i++) {
            tiers.add(new TicketTypeRequest("Tier " + i, new BigDecimal("10.00"), quantities[i]));
        }
        return new EventRequest("Title", "Description", "MUSIC", venueId, start, end, tiers);
    }

    @Test
    void organizerCannotChangeAnotherOrganizersPublishedEvent() {
        Event event = event(EventStatus.PUBLISHED);
        when(events.findWithDetailsById(event.getId())).thenReturn(Optional.of(event));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.cancel(event.getId(), stranger));

        assertEquals(403, ex.getStatusCode().value());
        assertEquals(EventStatus.PUBLISHED, event.getStatus());
    }

    @Test
    void draftEventIsHiddenFromOtherUsers() {
        Event event = event(EventStatus.DRAFT);
        when(events.findWithDetailsById(event.getId())).thenReturn(Optional.of(event));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.get(event.getId(), null));

        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void adminCanCancelAnyEvent() {
        Event event = event(EventStatus.PUBLISHED);
        when(events.findWithDetailsById(event.getId())).thenReturn(Optional.of(event));

        service.cancel(event.getId(), admin);

        assertEquals(EventStatus.CANCELLED, event.getStatus());
    }

    @Test
    void ownerCanPublishDraft() {
        Event event = event(EventStatus.DRAFT);
        when(events.findWithDetailsById(event.getId())).thenReturn(Optional.of(event));

        service.publish(event.getId(), owner);

        assertEquals(EventStatus.PUBLISHED, event.getStatus());
    }

    @Test
    void cancelledEventCannotBePublished() {
        Event event = event(EventStatus.CANCELLED);
        when(events.findWithDetailsById(event.getId())).thenReturn(Optional.of(event));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.publish(event.getId(), owner));

        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void createRejectsEndBeforeStart() {
        LocalDateTime start = LocalDateTime.now().plusDays(5);
        EventRequest request = request(UUID.randomUUID(), start, start.minusHours(1), 10);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.create(request, owner));

        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void createRejectsMoreTicketsThanVenueCapacity() {
        Venue venue = venue(100);
        when(venues.findById(venue.getId())).thenReturn(Optional.of(venue));
        LocalDateTime start = LocalDateTime.now().plusDays(5);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.create(request(venue.getId(), start, start.plusHours(2), 80, 50), owner));

        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void createSavesDraftOwnedByCaller() {
        Venue venue = venue(1000);
        when(venues.findById(venue.getId())).thenReturn(Optional.of(venue));
        when(events.save(any(Event.class))).thenAnswer(invocation -> invocation.getArgument(0));
        LocalDateTime start = LocalDateTime.now().plusDays(5);

        EventDetail detail = service.create(request(venue.getId(), start, start.plusHours(2), 300, 50), owner);

        assertEquals(EventStatus.DRAFT, detail.status());
        assertEquals(ownerId, detail.organizerId());
        assertEquals(2, detail.ticketTypes().size());
    }
}