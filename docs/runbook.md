# TicketFlow SRE & Incident Response Runbook

## 1. SLO & Alert Definitions (`monitoring/alert-rules.yml`)

| Alert Name | Severity | Condition | Target SLO |
| :--- | :--- | :--- | :--- |
| **`MicroserviceDown`** | `critical` | `up{job="ticketflow-microservices"} == 0` for `1m` | `99.9%` availability |
| **`HighCheckoutLatencyP95`** | `warning` | `p95(/api/bookings/checkout) > 800ms` for `2m` | `p95 < 800ms` |
| **`HighHttp5xxErrorRate`** | `critical` | `5xx rate > 5%` over `5m` | `< 0.5%` error rate |

---

## 2. Diagnostic Playbooks

### A. Flash-Sale Seat Contention Spike (`409 Conflict` vs `5xx`)
- **Expected Behavior**: During flash sales, competing buyers attempting to lock the same seat receive `HTTP 409 Conflict` from `SeatLockService` (`SET seat:lock:<eventId>:<seat> NX EX 600`). This is normal business contention, **not** a system error.
- **Verification**:
  ```bash
  # Inspect active 10-minute seat hold locks in Redis
  docker exec ticketflow-redis redis-cli KEYS "seat:lock:*"
  ```

### B. RabbitMQ Saga Backlog (`ticketflow.booking.created.queue`)
- **Symptom**: Bookings complete on `booking-service`, but QR notifications are delayed.
- **Verification**:
  ```bash
  # Check queue depth inside RabbitMQ
  docker exec ticketflow-rabbitmq rabbitmqctl list_queues name messages consumers
  ```
- **Remediation**: Scale `payment-service` and `notification-service` replicas (`kubectl scale deployment payment-service notification-service --replicas=3 -n ticketflow`).
