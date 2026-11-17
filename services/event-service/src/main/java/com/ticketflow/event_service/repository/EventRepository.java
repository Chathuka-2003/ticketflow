package com.ticketflow.event_service.repository;

import com.ticketflow.event_service.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {

    // Load the venue in the same query so lists don't trigger one extra query per event
    @Override
    @EntityGraph(attributePaths = "venue")
    Page<Event> findAll(Specification<Event> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"venue", "ticketTypes"})
    Optional<Event> findWithDetailsById(UUID id);

    @EntityGraph(attributePaths = "venue")
    Page<Event> findByOrganizerId(UUID organizerId, Pageable pageable);
}