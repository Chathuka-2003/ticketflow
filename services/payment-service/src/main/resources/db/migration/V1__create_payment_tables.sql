CREATE TABLE payments (
    id                 UUID PRIMARY KEY,
    booking_id         UUID           NOT NULL,
    booking_reference  VARCHAR(32)    NOT NULL,
    user_id            UUID           NOT NULL,
    user_email         VARCHAR(255)   NOT NULL,
    amount             NUMERIC(10, 2) NOT NULL,
    payment_method     VARCHAR(80)    NOT NULL,
    status             VARCHAR(32)    NOT NULL,
    idempotency_key    VARCHAR(100)   NOT NULL UNIQUE,
    transaction_ref    VARCHAR(64)    NOT NULL UNIQUE,
    created_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
