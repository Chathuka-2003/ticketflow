package com.ticketflow.booking_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "booking_seats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "seat_label", nullable = false, length = 24)
    private String seatLabel;

    @Column(name = "tier_name", nullable = false, length = 120)
    private String tierName;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
}
