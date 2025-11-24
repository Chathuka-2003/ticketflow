import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

/**
 * TicketFlow Flash-Sale Concurrency & HPA Load Test (k6)
 *
 * Run against local Docker Compose or Kubernetes Ingress:
 *   k6 run -e BASE_URL=http://localhost:8080 load-tests/flash-sale.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const CONTESTED_EVENT_ID = __ENV.EVENT_ID || '00000000-0000-0000-0000-000000000001';
const CONTESTED_SEAT = __ENV.SEAT_LABEL || 'A1';

const lockAcquiredCounter = new Counter('redis_seat_lock_acquired_201');
const lockConflictCounter = new Counter('redis_seat_lock_conflict_409');

export const options = {
  scenarios: {
    // 1. High-concurrency catalog & seat-map browsing spike (triggers K8s HPA)
    catalog_browsing_spike: {
      executor: 'ramping-vus',
      exec: 'browseCatalogAndSeatMap',
      startVUs: 5,
      stages: [
        { duration: '15s', target: 30 },
        { duration: '30s', target: 50 },
        { duration: '10s', target: 0 },
      ],
    },
    // 2. Concurrent flash-sale race on the EXACT same seat (verifies Redis SETNX atomicity)
    concurrent_seat_hold_race: {
      executor: 'per-vu-iterations',
      exec: 'raceForSameSeat',
      vus: 15,
      iterations: 1,
      startTime: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    // Exactly 1 virtual user must win the contested Redis seat lock
    redis_seat_lock_acquired_201: ['count==1'],
    redis_seat_lock_conflict_409: ['count>=14'],
  },
};

export function browseCatalogAndSeatMap() {
  const eventsRes = http.get(`${BASE_URL}/api/events?page=0&size=12`);
  check(eventsRes, {
    'GET /api/events status is 200': (r) => r.status === 200,
  });

  const seatsRes = http.get(`${BASE_URL}/api/bookings/events/${CONTESTED_EVENT_ID}/seats`);
  check(seatsRes, {
    'GET /api/bookings/events/{id}/seats status is 200': (r) => r.status === 200,
  });

  sleep(0.3);
}

export function raceForSameSeat() {
  const email = `racer-${__VU}-${Date.now()}@ticketflow.io`;
  const password = 'Password123!';

  http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ email, password, fullName: `Racer VU ${__VU}`, role: 'USER' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const token = loginRes.json('accessToken');

  const holdPayload = JSON.stringify({
    eventId: CONTESTED_EVENT_ID,
    eventTitle: 'Neon Pulse: Synthwave World Tour 2027',
    eventStartsAt: '2026-12-15T19:00:00',
    venueName: 'Lotus Arena & Dome',
    city: 'Colombo',
    category: 'MUSIC',
    seats: [{ label: CONTESTED_SEAT, tierName: 'VIP Front Row Pit', price: 149.0 }],
  });

  const holdRes = http.post(`${BASE_URL}/api/bookings/hold`, holdPayload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (holdRes.status === 201) {
    lockAcquiredCounter.add(1);
  } else if (holdRes.status === 409) {
    lockConflictCounter.add(1);
  }

  check(holdRes, {
    'Seat hold returned 201 (winner) or 409 (Redis lock conflict)': (r) =>
      r.status === 201 || r.status === 409,
  });
}
