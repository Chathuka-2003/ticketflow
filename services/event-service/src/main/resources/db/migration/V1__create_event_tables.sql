CREATE TABLE venues (
                        id         UUID PRIMARY KEY,
                        name       VARCHAR(150) NOT NULL,
                        city       VARCHAR(100) NOT NULL,
                        address    VARCHAR(255),
                        capacity   INTEGER      NOT NULL CHECK (capacity > 0),
                        created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
                        id           UUID PRIMARY KEY,
                        organizer_id UUID         NOT NULL,
                        venue_id     UUID         NOT NULL REFERENCES venues(id),
                        title        VARCHAR(200) NOT NULL,
                        description  TEXT,
                        category     VARCHAR(50)  NOT NULL,
                        starts_at    TIMESTAMP    NOT NULL,
                        ends_at      TIMESTAMP    NOT NULL,
                        status       VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
                        created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
                        updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
                        CONSTRAINT chk_event_dates CHECK (ends_at > starts_at)
);

CREATE TABLE ticket_types (
                              id       UUID PRIMARY KEY,
                              event_id UUID           NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                              name     VARCHAR(80)    NOT NULL,
                              price    NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
                              quantity INTEGER        NOT NULL CHECK (quantity > 0),
                              UNIQUE (event_id, name)
);

CREATE INDEX idx_events_status_starts ON events(status, starts_at);
CREATE INDEX idx_events_organizer     ON events(organizer_id);
CREATE INDEX idx_events_category      ON events(category);