# TicketFlow — Cloud-Native Event Ticket Booking Platform

![CI](https://github.com/Chathuka-2003/ticketflow/actions/workflows/ci.yml/badge.svg)

**TicketFlow** is a cloud-native, microservices-based event ticket booking platform built with **Spring Boot 3 (Java 21)**, **Spring Cloud Gateway**, **PostgreSQL 16**, **Redis 7**, **RabbitMQ 3**, and a modern **Angular** frontend served by a **non-root Nginx container**.

---

## ✨ Key Highlights

- **Interactive Arena Seat Map & 10-Minute Redis TTL Lock**: Select seats across tiered sections (`VIP Front Row`, `Golden Circle`, `Grandstand`), lock seats with a live 10-minute countdown timer, and prevent double-booking under high traffic.
- **Distributed Saga Choreography Visualizer**: Experience the full async workflow (`Seat Hold` → `RabbitMQ BookingCreated` → `PaymentService Idempotent Charge` → `NotificationService QR Ticket Email`) including **Saga Compensation Rollback** when simulating a payment failure.
- **Role-Protected Organizer Studio (`ROLE_ORGANIZER` / `ROLE_ADMIN`)**: Create venues, build multi-tier events with capacity validation, save drafts, and publish live to the public catalog.
- **OAuth2 / JWKS Zero-Trust Security**: Asymmetric RS256 JWTs verified via `/.well-known/jwks.json`, rotating SHA-256 `HttpOnly` refresh cookies, and an Angular HTTP interceptor (`authInterceptor`).
- **Production Nginx Container with Runtime Env Injection**: Multi-stage Docker build (`node:24-alpine` → `nginx:1.27-alpine` non-root), gzip compression, SPA routing fallback, `/api/` reverse proxy, and `envsubst` runtime configuration (`API_URL`).

---

## 🏗️ Project Structure

```text
ticketflow/
├── docker/postgres/init/         # Initializes auth_db, event_db, booking_db, payment_db
├── docs/architecture.md          # Detailed system design & Saga choreography docs
├── frontend/ticketflow-ui/       # Angular SPA + Nginx config + multi-stage Dockerfile
│   ├── nginx.conf                # Non-root Nginx (:8080), SPA fallback, /api/ proxy, gzip
│   ├── docker-entrypoint.sh      # Injects runtime API_URL into /usr/share/nginx/html/env.js
│   ├── Dockerfile                # Multi-stage Node 24 build -> Nginx 1.27 non-root runtime
│   └── src/app/
│       ├── core/                 # ConfigService, AuthService, EventService, BookingService, Guards, Interceptor
│       ├── shared/               # Glassmorphic Navbar (with live hold timer) & Telemetry Footer
│       └── features/             # EventList, SeatSelection, Checkout (Saga Visualizer), MyBookings, OrganizerStudio, Login
├── services/
│   ├── api-gateway/              # Spring Cloud Gateway (:8080) - Routing, CORS, JWT verification
│   ├── auth-service/             # OIDC/JWKS Auth Service (:8081) - RS256 JWT, Refresh Token rotation
│   └── event-service/            # Event & Venue Service (:8082) - PostgreSQL + Flyway + RBAC
└── docker-compose.yml            # Full stack orchestration (Postgres, Redis, RabbitMQ, Services, Nginx UI)
```

---

## 🚀 Quick Start (Docker Compose)

```bash
# 1. Start the entire platform (PostgreSQL, Redis, RabbitMQ, Microservices, and Nginx Frontend)
docker compose up -d --build

# 2. Check container health status
docker compose ps
```

### 🌐 Local Endpoints

| Component | URL | Description |
| :--- | :--- | :--- |
| **Angular Frontend (Nginx)** | [http://localhost:4200](http://localhost:4200) or [http://localhost](http://localhost) | Full TicketFlow Web Application |
| **API Gateway** | [http://localhost:8080](http://localhost:8080) | Unified REST entry point (`/api/auth/**`, `/api/events/**`, `/api/venues/**`) |
| **Auth Service JWKS** | [http://localhost:8081/.well-known/jwks.json](http://localhost:8081/.well-known/jwks.json) | Public RSA key set for JWT verification |
| **Event Service** | [http://localhost:8082/actuator/health](http://localhost:8082/actuator/health) | Event & Venue microservice health |
| **RabbitMQ Management** | [http://localhost:15672](http://localhost:15672) | Broker UI (`ticketflow` / `ticketflow_secret`) |

---

## 🔑 Demo Credentials (1-Click Login Available in UI)

- **Organizer Account (`ROLE_ORGANIZER`)**: `organizer@ticketflow.io` / `Password123!`
- **Attendee Account (`ROLE_USER`)**: `attendee@ticketflow.io` / `Password123!`
