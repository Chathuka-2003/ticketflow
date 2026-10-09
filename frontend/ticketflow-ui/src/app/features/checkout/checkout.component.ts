import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SagaEventStep } from '../../core/models/booking.models';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  template: `
    <div class="tf-container checkout-page">
      @if (!bookingService.activeHold() && !completedBookingId()) {
        <div class="empty-hold glass-card animate-scale">
          <div class="eh-icon">⌛</div>
          <h2>No Active Redis Seat Hold</h2>
          <p>
            Your 10-minute seat reservation lock has either expired or been released.
            Select your seats again to acquire a fresh lock.
          </p>
          <a routerLink="/" class="btn btn-primary btn-lg">Browse Live Events</a>
        </div>
      } @else if (bookingService.activeHold(); as hold) {
        <!-- Top Redis TTL Countdown Banner -->
        <div class="redis-lock-banner glass-card animate-fade-up">
          <div class="rl-left">
            <span class="live-dot"></span>
            <div>
              <strong>REDIS DISTRIBUTED SEAT LOCK ACTIVE</strong>
              <code class="redis-key">{{ hold.redisKey }}</code>
            </div>
          </div>
          <div class="rl-right">
            <div class="timer-box">
              <span class="t-lbl">TTL EXPIRES IN</span>
              <span class="t-val">{{ bookingService.formattedHoldTimer() }}</span>
            </div>
            <button class="btn btn-danger btn-sm" [disabled]="processingSaga()" (click)="cancelHold()">
              Release Lock
            </button>
          </div>
        </div>

        <div class="checkout-grid">
          <!-- Left Column: Payment & Saga Simulation Controls -->
          <div class="payment-panel glass-card animate-fade-up stagger-1">
            <h2>Checkout & Saga Choreography</h2>
            <p class="sub">
              Complete your reservation. Every payment request carries an
              <code>X-Idempotency-Key</code> header to guarantee exactly-once processing.
            </p>

            <!-- Idempotency Key Inspector -->
            <div class="idempotency-box">
              <div class="idemp-header">
                <span>🛡️ IDEMPOTENCY KEY (PAYMENT-SERVICE)</span>
                <span class="badge badge-published">DEDUPLICATION ARMED</span>
              </div>
              <div class="idemp-code-row">
                <code>{{ hold.idempotencyKey }}</code>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="testDuplicateIdempotency()"
                >
                  Test Duplicate Request
                </button>
              </div>
            </div>

            <!-- Saga Outcome Simulator Toggle -->
            <div class="sim-selector">
              <label class="section-lbl">SAGA CHOREOGRAPHY SIMULATION MODE</label>
              <div class="sim-cards">
                <button
                  type="button"
                  class="sim-card"
                  [class.active]="simulationOutcome() === 'SUCCESS'"
                  (click)="simulationOutcome.set('SUCCESS')"
                >
                  <div class="sc-top">
                    <span class="sc-icon">✅</span>
                    <strong>PaymentCompleted (Happy Path)</strong>
                  </div>
                  <p>
                    Payment succeeds → Booking confirmed → Notification service sends
                    digital ticket email.
                  </p>
                </button>

                <button
                  type="button"
                  class="sim-card fail-mode"
                  [class.active]="simulationOutcome() === 'FAILURE'"
                  (click)="simulationOutcome.set('FAILURE')"
                >
                  <div class="sc-top">
                    <span class="sc-icon">💥</span>
                    <strong>PaymentFailed (Saga Rollback)</strong>
                  </div>
                  <p>
                    Simulates card decline → RabbitMQ publishes PaymentFailed →
                    Compensating transaction releases Redis seat lock!
                  </p>
                </button>
              </div>
            </div>

            <!-- Mock Payment Card Form -->
            <div class="card-form">
              <div class="form-group">
                <label>Cardholder Name</label>
                <input
                  type="text"
                  class="tf-input"
                  [(ngModel)]="cardholderName"
                  placeholder="Alex Rivera"
                />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label>Card Number (Mock Gateway)</label>
                  <input
                    type="text"
                    class="tf-input mono"
                    [(ngModel)]="cardNumber"
                    placeholder="4242 •••• •••• 4242"
                  />
                </div>
                <div class="form-group">
                  <label>Expiry / CVC</label>
                  <input
                    type="text"
                    class="tf-input mono"
                    [(ngModel)]="cardExpiry"
                    placeholder="08/29 • 884"
                  />
                </div>
              </div>
            </div>

            <!-- Live Async Event Saga Visualizer -->
            <div class="saga-visualizer">
              <div class="sv-header">
                <span>🐇 LIVE EVENT-DRIVEN SAGA PIPELINE</span>
                @if (processingSaga()) {
                  <span class="sv-status">Processing Choreography...</span>
                }
              </div>

              <div class="saga-steps-list">
                @for (step of sagaSteps(); track step.id) {
                  <div
                    class="saga-step-item"
                    [class.active]="step.status === 'ACTIVE'"
                    [class.completed]="step.status === 'COMPLETED'"
                    [class.failed]="step.status === 'FAILED'"
                  >
                    <div class="step-indicator">
                      @if (step.status === 'COMPLETED') {
                        <span>✓</span>
                      } @else if (step.status === 'FAILED') {
                        <span>✕</span>
                      } @else if (step.status === 'ACTIVE') {
                        <span class="pulse-spin">⚡</span>
                      } @else {
                        <span>•</span>
                      }
                    </div>
                    <div class="step-body">
                      <div class="step-top">
                        <span class="svc-tag">{{ step.service }}</span>
                        <strong>{{ step.action }}</strong>
                        @if (step.timestamp) {
                          <span class="step-time">{{ step.timestamp }}</span>
                        }
                      </div>
                      <p>{{ step.detail }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="checkout-actions">
              <button
                class="btn btn-primary btn-lg pay-btn"
                [class.btn-danger]="simulationOutcome() === 'FAILURE'"
                [disabled]="processingSaga()"
                (click)="executeSagaCheckout()"
              >
                @if (processingSaga()) {
                  <span>⏳ Executing Distributed Saga Choreography...</span>
                } @else if (simulationOutcome() === 'SUCCESS') {
                  <span>⚡ Authorize \${{ hold.grandTotal | number: '1.2-2' }} & Issue Tickets</span>
                } @else {
                  <span>💥 Trigger PaymentFailed & Test Compensation Rollback</span>
                }
              </button>
            </div>
          </div>

          <!-- Right Column: Order & Seat Lock Breakdown -->
          <aside class="order-card glass-card animate-fade-up stagger-2">
            <h3>Order Summary</h3>
            <div class="event-mini">
              <span class="badge badge-category">{{ hold.category }}</span>
              <h4>{{ hold.eventTitle }}</h4>
              <p>📍 {{ hold.venueName }} • {{ hold.city }}</p>
              <p>🕒 {{ hold.eventStartsAt | date: 'EEE, MMM d, y • h:mm a' }}</p>
            </div>

            <div class="divider-h"></div>

            <div class="held-seats">
              <span class="section-lbl">LOCKED SEATS ({{ hold.seats.length }})</span>
              @for (s of hold.seats; track s.id) {
                <div class="hs-row">
                  <div>
                    <span class="seat-pill" [style.background]="s.color">{{ s.label }}</span>
                    <strong>{{ s.tierName }}</strong>
                  </div>
                  <span class="mono">\${{ s.price | number: '1.2-2' }}</span>
                </div>
              }
            </div>

            <div class="divider-h"></div>

            <div class="totals-list">
              <div class="t-row">
                <span>Subtotal</span>
                <span>\${{ hold.totalAmount | number: '1.2-2' }}</span>
              </div>
              <div class="t-row">
                <span>Service & Gateway Fee</span>
                <span>\${{ hold.serviceFee | number: '1.2-2' }}</span>
              </div>
              <div class="t-row grand">
                <span>Total Amount</span>
                <span class="text-gradient">\${{ hold.grandTotal | number: '1.2-2' }}</span>
              </div>
            </div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .checkout-page {
      padding-top: 2rem;
    }

    .empty-hold {
      text-align: center;
      padding: 4rem 2rem;
      max-width: 600px;
      margin: 3rem auto;

      .eh-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      h2 {
        font-family: var(--font-display);
        margin-bottom: 0.65rem;
      }

      p {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
      }
    }

    .redis-lock-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1.1rem 1.5rem;
      margin-bottom: 1.75rem;
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.4);
    }

    .rl-left {
      display: flex;
      align-items: center;
      gap: 0.9rem;

      div {
        display: flex;
        flex-direction: column;
      }

      strong {
        font-size: 0.82rem;
        letter-spacing: 0.05em;
        color: #fde68a;
      }

      .redis-key {
        font-family: var(--font-mono);
        font-size: 0.78rem;
        color: var(--text-secondary);
      }
    }

    .rl-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .timer-box {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.85rem;
      border-radius: 10px;
      background: rgba(7, 8, 13, 0.65);
      border: 1px solid rgba(245, 158, 11, 0.35);

      .t-lbl {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        color: var(--text-muted);
      }

      .t-val {
        font-family: var(--font-mono);
        font-size: 1.15rem;
        font-weight: 700;
        color: #fbbf24;
      }
    }

    .checkout-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 2rem;
      align-items: start;
    }

    .payment-panel {
      padding: 2rem;

      h2 {
        font-family: var(--font-display);
        font-size: 1.5rem;
        margin-bottom: 0.4rem;
      }

      .sub {
        color: var(--text-secondary);
        font-size: 0.92rem;
        margin-bottom: 1.5rem;
      }
    }

    .idempotency-box {
      padding: 1rem 1.2rem;
      border-radius: var(--radius-md);
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(6, 182, 212, 0.3);
      margin-bottom: 1.5rem;

      .idemp-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        color: #67e8f9;
        margin-bottom: 0.6rem;
      }

      .idemp-code-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;

        code {
          font-family: var(--font-mono);
          font-size: 0.86rem;
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
        }
      }
    }

    .section-lbl {
      display: block;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 0.65rem;
    }

    .sim-selector {
      margin-bottom: 1.5rem;
    }

    .sim-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .sim-card {
      text-align: left;
      padding: 1rem;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.03);
      border: 1.5px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: all 0.22s ease;

      .sc-top {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.4rem;
        font-size: 0.9rem;
      }

      p {
        font-size: 0.78rem;
        color: var(--text-secondary);
        line-height: 1.4;
      }

      &.active {
        background: rgba(16, 185, 129, 0.12);
        border-color: #10b981;
      }

      &.fail-mode.active {
        background: rgba(244, 63, 94, 0.12);
        border-color: #f43f5e;
      }
    }

    .card-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 1rem;
    }

    .mono {
      font-family: var(--font-mono);
    }

    /* Saga Visualizer */
    .saga-visualizer {
      padding: 1.25rem;
      border-radius: var(--radius-md);
      background: rgba(7, 8, 13, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 1.75rem;

      .sv-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font-mono);
        font-size: 0.74rem;
        font-weight: 700;
        color: #c4b5fd;
        margin-bottom: 1rem;
      }

      .sv-status {
        color: #34d399;
      }
    }

    .saga-steps-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .saga-step-item {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      padding: 0.75rem 0.95rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: all 0.3s ease;

      &.active {
        background: rgba(139, 92, 246, 0.16);
        border-color: #8b5cf6;
        transform: translateX(4px);
      }

      &.completed {
        background: rgba(16, 185, 129, 0.09);
        border-color: rgba(16, 185, 129, 0.35);
      }

      &.failed {
        background: rgba(244, 63, 94, 0.12);
        border-color: rgba(244, 63, 94, 0.45);
      }
    }

    .step-indicator {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      display: grid;
      place-items: center;
      font-size: 0.78rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .saga-step-item.completed .step-indicator {
      background: #10b981;
      color: #052e16;
    }

    .saga-step-item.failed .step-indicator {
      background: #f43f5e;
      color: #fff;
    }

    .step-body {
      flex: 1;

      .step-top {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        flex-wrap: wrap;
        margin-bottom: 0.2rem;
      }

      .svc-tag {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        padding: 0.1rem 0.45rem;
        border-radius: 4px;
        background: rgba(139, 92, 246, 0.25);
        color: #ddd6fe;
      }

      strong {
        font-size: 0.86rem;
      }

      .step-time {
        margin-left: auto;
        font-family: var(--font-mono);
        font-size: 0.7rem;
        color: var(--text-muted);
      }

      p {
        font-size: 0.78rem;
        color: var(--text-secondary);
      }
    }

    .pay-btn {
      width: 100%;
    }

    /* Order Sidebar */
    .order-card {
      padding: 1.5rem;
      position: sticky;
      top: 96px;

      h3 {
        font-family: var(--font-display);
        font-size: 1.2rem;
        margin-bottom: 1rem;
      }
    }

    .event-mini {
      h4 {
        font-family: var(--font-display);
        font-size: 1.1rem;
        margin: 0.5rem 0 0.35rem;
      }

      p {
        font-size: 0.82rem;
        color: var(--text-secondary);
        margin-bottom: 0.2rem;
      }
    }

    .divider-h {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 1.15rem 0;
    }

    .held-seats {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .hs-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.86rem;

      div {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .seat-pill {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.18rem 0.45rem;
        border-radius: 5px;
        color: #fff;
      }
    }

    .totals-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.88rem;

      .t-row {
        display: flex;
        justify-content: space-between;
        color: var(--text-secondary);

        &.grand {
          padding-top: 0.65rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 1.15rem;
          font-weight: 700;
          color: #fff;
        }
      }
    }

    @media (max-width: 960px) {
      .checkout-grid {
        grid-template-columns: 1fr;
      }
      .sim-cards {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class CheckoutComponent implements OnInit {
  readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  cardholderName = 'Alex Rivera';
  cardNumber = '4242 •••• •••• 4242';
  cardExpiry = '08/29 • 884';

  readonly simulationOutcome = signal<'SUCCESS' | 'FAILURE'>('SUCCESS');
  readonly processingSaga = signal<boolean>(false);
  readonly completedBookingId = signal<string | null>(null);

  readonly sagaSteps = signal<SagaEventStep[]>([
    {
      id: 'step-1',
      service: 'booking-service + Redis',
      action: 'Seat Hold Lock Acquired (TTL 10m)',
      detail: 'Atomic SETNX lock stored in Redis cluster for selected seats.',
      status: 'COMPLETED',
      timestamp: '0ms',
    },
    {
      id: 'step-2',
      service: 'RabbitMQ Broker',
      action: 'Publish BookingCreated Event',
      detail: 'Dispatches BookingCreated payload to ticketflow.events.exchange.',
      status: 'PENDING',
    },
    {
      id: 'step-3',
      service: 'payment-service',
      action: 'Verify Idempotency Key & Process Payment',
      detail: 'Checks PostgreSQL idempotency_keys table and charges card.',
      status: 'PENDING',
    },
    {
      id: 'step-4',
      service: 'notification-service',
      action: 'Confirm Booking & Send Digital Ticket Email',
      detail: 'Consumes PaymentCompleted event & emails QR code pass.',
      status: 'PENDING',
    },
  ]);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user?.fullName) {
      this.cardholderName = user.fullName;
    }
  }

  testDuplicateIdempotency(): void {
    const hold = this.bookingService.activeHold();
    if (!hold) return;
    this.toast.info(
      'Idempotency Key Verified',
      `Key ${hold.idempotencyKey.slice(0, 12)}... guarantees payment-service returns cached response without double-charging.`
    );
  }

  cancelHold(): void {
    const hold = this.bookingService.activeHold();
    const eventId = hold?.eventId;
    this.bookingService.releaseHold(true);
    if (eventId) {
      this.router.navigate(['/events', eventId]);
    } else {
      this.router.navigate(['/']);
    }
  }

  executeSagaCheckout(): void {
    const hold = this.bookingService.activeHold();
    if (!hold || this.processingSaga()) return;

    this.processingSaga.set(true);
    const shouldSucceed = this.simulationOutcome() === 'SUCCESS';

    // Step 2: RabbitMQ BookingCreated
    this.updateStep('step-2', 'ACTIVE');

    setTimeout(() => {
      this.updateStep('step-2', 'COMPLETED', '140ms');
      this.updateStep('step-3', 'ACTIVE');

      setTimeout(() => {
        if (shouldSucceed) {
          this.updateStep('step-3', 'COMPLETED', '390ms');
          this.updateStep('step-4', 'ACTIVE');

          setTimeout(() => {
            this.updateStep('step-4', 'COMPLETED', '520ms');
            const record = this.bookingService.finalizeBooking(
              hold,
              'VISA •••• 4242',
              this.sagaSteps(),
              true
            );
            this.completedBookingId.set(record.id);
            this.processingSaga.set(false);
            this.toast.success(
              'Booking Confirmed! 🎉',
              `Reference ${record.bookingReference} • Confirmation email dispatched by notification-service.`
            );
            this.router.navigate(['/my-bookings']);
          }, 550);
        } else {
          // Simulate PaymentFailed Saga Compensation
          this.updateStep(
            'step-3',
            'FAILED',
            '410ms',
            'Payment declined! Published PaymentFailed event to RabbitMQ.'
          );
          this.updateStep(
            'step-4',
            'FAILED',
            '480ms',
            'Saga Compensation: booking-service released Redis seat hold back to AVAILABLE.'
          );

          setTimeout(() => {
            const eventId = hold.eventId;
            this.bookingService.finalizeBooking(
              hold,
              'VISA •••• 4242',
              this.sagaSteps(),
              false
            );
            this.processingSaga.set(false);
            this.toast.error(
              'PaymentFailed — Saga Compensated',
              'Seats have been automatically unlocked in Redis and returned to the arena pool.'
            );
            this.router.navigate(['/events', eventId]);
          }, 1200);
        }
      }, 600);
    }, 450);
  }

  private updateStep(
    id: string,
    status: SagaEventStep['status'],
    timestamp?: string,
    customDetail?: string
  ): void {
    this.sagaSteps.update((steps) =>
      steps.map((s) =>
        s.id === id
          ? {
              ...s,
              status,
              timestamp: timestamp ?? s.timestamp,
              detail: customDetail ?? s.detail,
            }
          : s
      )
    );
  }
}
