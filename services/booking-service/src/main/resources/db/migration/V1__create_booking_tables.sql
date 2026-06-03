CREATE TABLE bookings (
    id                 UUID PRIMARY KEY,
    booking_reference  VARCHAR(32)    NOT NULL UNIQUE,
    hold_id            VARCHAR(64)    NOT NULL,
    user_id            UUID           NOT NULL,
    user_email         VARCHAR(255)   NOT NULL,
    event_id           UUID           NOT NULL,
    event_title        VARCHAR(200)   NOT NULL,
    event_category     VARCHAR(60)    NOT NULL,
    event_starts_at    VARCHAR(64)    NOT NULL,
    venue_name         VARCHAR(200)   NOT NULL,
    city               VARCHAR(120)   NOT NULL,
    total_amount       NUMERIC(10, 2) NOT NULL,
    service_fee        NUMERIC(10, 2) NOT NULL,
    grand_total        NUMERIC(10, 2) NOT NULL,
    status             VARCHAR(32)    NOT NULL,
    idempotency_key    VARCHAR(100)   NOT NULL UNIQUE,
    payment_method     VARCHAR(80)    NOT NULL,
    created_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_seats (
    id          UUID PRIMARY KEY,
    booking_id  UUID           NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_label  VARCHAR(24)    NOT NULL,
    tier_name   VARCHAR(120)   NOT NULL,
    price       NUMERIC(10, 2) NOT NULL
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_event_id_status ON bookings(event_id, status);
CREATE INDEX idx_booking_seats_booking_id ON booking_seats(booking_id);
