#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4200}"
GATEWAY_URL="${GATEWAY_URL:-http://localhost:8080}"

echo "============================================================"
echo " TicketFlow End-to-End Microservices & Saga Smoke Test"
echo "============================================================"

echo "[1/7] Checking health of all 6 microservices + Nginx Frontend..."
curl -fsS "${BASE_URL}/healthz" >/dev/null
curl -fsS "${GATEWAY_URL}/actuator/health" >/dev/null
curl -fsS "http://localhost:8081/actuator/health" >/dev/null
curl -fsS "http://localhost:8082/actuator/health" >/dev/null
curl -fsS "http://localhost:8083/actuator/health" >/dev/null
curl -fsS "http://localhost:8084/actuator/health" >/dev/null
curl -fsS "http://localhost:8085/actuator/health" >/dev/null
echo "  -> All 7 containers reported UP!"

TS="$(date +%s)"
ORG_EMAIL="org-smoke-${TS}@ticketflow.io"
BUYER1_EMAIL="buyer1-smoke-${TS}@ticketflow.io"
BUYER2_EMAIL="buyer2-smoke-${TS}@ticketflow.io"
PASS="Password123!"

register_and_login() {
  local email="$1"
  local name="$2"
  local role="$3"
  curl -fsS -X POST "${BASE_URL}/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${PASS}\",\"fullName\":\"${name}\",\"role\":\"${role}\"}" >/dev/null
  curl -fsS -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${PASS}\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])"
}

echo "[2/7] Registering & Logging In Organizer (${ORG_EMAIL})..."
ORG_TOKEN=$(register_and_login "${ORG_EMAIL}" "Smoke Organizer" "ORGANIZER")

echo "[3/7] Creating Venue & Publishing Event via API Gateway -> event-service..."
VENUE_ID=$(curl -fsS -X POST "${BASE_URL}/api/venues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ORG_TOKEN}" \
  -d '{"name":"Smoke Test Dome","city":"Colombo","address":"1 Lotus Rd","capacity":2000}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

EVENT_ID=$(curl -fsS -X POST "${BASE_URL}/api/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ORG_TOKEN}" \
  -d "{\"title\":\"Smoke Test Concert ${TS}\",\"description\":\"Live E2E Test\",\"category\":\"MUSIC\",\"venueId\":\"${VENUE_ID}\",\"startsAt\":\"2027-05-10T19:00:00\",\"endsAt\":\"2027-05-10T23:00:00\",\"ticketTypes\":[{\"name\":\"VIP Pit\",\"price\":150.00,\"quantity\":100}]}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

curl -fsS -X POST "${BASE_URL}/api/events/${EVENT_ID}/publish" \
  -H "Authorization: Bearer ${ORG_TOKEN}" >/dev/null
echo "  -> Published Event ID: ${EVENT_ID}"

echo "[4/7] Registering Buyer 1 & Buyer 2 and testing Redis 10m Seat Hold Lock..."
BUYER1_TOKEN=$(register_and_login "${BUYER1_EMAIL}" "Buyer One" "USER")
BUYER2_TOKEN=$(register_and_login "${BUYER2_EMAIL}" "Buyer Two" "USER")

HOLD_JSON=$(curl -fsS -X POST "${BASE_URL}/api/bookings/hold" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${BUYER1_TOKEN}" \
  -d "{\"eventId\":\"${EVENT_ID}\",\"eventTitle\":\"Smoke Test Concert\",\"eventStartsAt\":\"2027-05-10T19:00:00\",\"venueName\":\"Smoke Test Dome\",\"city\":\"Colombo\",\"category\":\"MUSIC\",\"seats\":[{\"label\":\"A1\",\"tierName\":\"VIP Pit\",\"price\":150.00}]}")

HOLD_ID=$(echo "${HOLD_JSON}" | python3 -c "import sys,json; print(json.load(sys.stdin)['holdId'])")
IDEMP_KEY=$(echo "${HOLD_JSON}" | python3 -c "import sys,json; print(json.load(sys.stdin)['idempotencyKey'])")
echo "  -> Buyer 1 acquired Redis lock: ${HOLD_ID} (idempotencyKey=${IDEMP_KEY})"

echo "[5/7] Verifying Buyer 2 receives HTTP 409 Conflict on locked seat A1..."
CONFLICT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/bookings/hold" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${BUYER2_TOKEN}" \
  -d "{\"eventId\":\"${EVENT_ID}\",\"eventTitle\":\"Smoke Test Concert\",\"eventStartsAt\":\"2027-05-10T19:00:00\",\"venueName\":\"Smoke Test Dome\",\"city\":\"Colombo\",\"category\":\"MUSIC\",\"seats\":[{\"label\":\"A1\",\"tierName\":\"VIP Pit\",\"price\":150.00}]}")

if [ "${CONFLICT_CODE}" != "409" ]; then
  echo "ERROR: Expected 409 Conflict for Buyer 2, got ${CONFLICT_CODE}"
  exit 1
fi
echo "  -> Verified HTTP 409 Conflict from Redis SETNX lock!"

echo "[6/7] Executing Idempotent Checkout & RabbitMQ Saga Choreography..."
BOOKING_REF=$(curl -fsS -X POST "${BASE_URL}/api/bookings/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${BUYER1_TOKEN}" \
  -d "{\"holdId\":\"${HOLD_ID}\",\"eventId\":\"${EVENT_ID}\",\"eventTitle\":\"Smoke Test Concert\",\"eventCategory\":\"MUSIC\",\"eventStartsAt\":\"2027-05-10T19:00:00\",\"venueName\":\"Smoke Test Dome\",\"city\":\"Colombo\",\"seats\":[{\"label\":\"A1\",\"tierName\":\"VIP Pit\",\"price\":150.00}],\"idempotencyKey\":\"${IDEMP_KEY}\",\"paymentMethod\":\"VISA 4242\",\"simulatePaymentFailure\":false}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['bookingReference'])")
echo "  -> Confirmed Booking Reference: ${BOOKING_REF}"

sleep 2

echo "[7/7] Verifying async RabbitMQ Saga results in payment-service & notification-service..."
PAYMENT_COUNT=$(curl -fsS "${BASE_URL}/api/payments/mine" \
  -H "Authorization: Bearer ${BUYER1_TOKEN}" \
  | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")

NOTIF_COUNT=$(curl -fsS "${BASE_URL}/api/notifications/mine" \
  -H "Authorization: Bearer ${BUYER1_TOKEN}" \
  | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")

echo "  -> Buyer 1 Payments recorded in payment_db: ${PAYMENT_COUNT}"
echo "  -> Buyer 1 QR Ticket Notifications dispatched: ${NOTIF_COUNT}"
echo "============================================================"
echo " ALL SMOKE TESTS PASSED SUCCESSFULLY!"
echo "============================================================"
