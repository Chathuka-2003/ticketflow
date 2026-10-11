import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { EventService } from '../../../core/services/event.service';
import { BookingRecord } from '../../../core/models/booking.models';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    <div class="tf-container bookings-page">
      <div class="page-header animate-fade-up">
        <div>
          <span class="badge badge-category">🎟️ DIGITAL PASS WALLET</span>
          <h1>My Bookings & Passes</h1>
          <p>
            Instant QR digital tickets backed by idempotent payment verification and
            RabbitMQ event confirmation.
          </p>
        </div>

        <div class="filter-tabs">
          @for (tab of ['ALL', 'CONFIRMED', 'CANCELLED']; track tab) {
            <button
              class="tab-btn"
              [class.active]="statusFilter() === tab"
              (click)="statusFilter.set(tab)"
            >
              {{ tab }}
            </button>
          }
        </div>
      </div>

      @if (filteredBookings().length === 0) {
        <div class="empty-wallet glass-card animate-scale">
          <div class="ew-icon">🎫</div>
          <h2>No Bookings Found</h2>
          <p>
            You don't have any {{ statusFilter() !== 'ALL' ? statusFilter().toLowerCase() : '' }}
            ticket reservations yet. Explore live concerts, tech conferences, and arena sports
            to lock in your seats!
          </p>
          <a routerLink="/" class="btn btn-primary btn-lg">Explore Live Events</a>
        </div>
      } @else {
        <div class="tickets-list">
          @for (b of filteredBookings(); track b.id; let idx = $index) {
            @let meta = eventService.getVisualMeta(b.eventTitle, b.eventCategory);
            <article
              class="ticket-pass glass-card animate-fade-up"
              [class.cancelled]="b.status === 'CANCELLED'"
              [style.animation-delay]="(idx % 5) * 0.06 + 's'"
            >
              <!-- Left Artwork Stub -->
              <div class="pass-media">
                <img [src]="meta.bannerUrl" [alt]="b.eventTitle" />
                <div class="pass-media-overlay"></div>
                <span class="badge badge-category pass-cat">
                  {{ meta.badgeIcon }} {{ b.eventCategory }}
                </span>
              </div>

              <!-- Center Event & Seat Details -->
              <div class="pass-main">
                <div class="pass-top-row">
                  <span class="ref-code">REF: {{ b.bookingReference }}</span>
                  <span
                    class="badge"
                    [class.badge-confirmed]="b.status === 'CONFIRMED'"
                    [class.badge-cancelled]="b.status === 'CANCELLED'"
                  >
                    ● {{ b.status }}
                  </span>
                </div>

                <h3 class="pass-title">
                  <a [routerLink]="['/events', b.eventId]">{{ b.eventTitle }}</a>
                </h3>

                <div class="pass-meta-grid">
                  <div>
                    <span class="pm-lbl">VENUE</span>
                    <strong>{{ b.venueName }} • {{ b.city }}</strong>
                  </div>
                  <div>
                    <span class="pm-lbl">SHOWTIME</span>
                    <strong>{{ b.eventStartsAt | date: 'EEE, MMM d, y • h:mm a' }}</strong>
                  </div>
                  <div>
                    <span class="pm-lbl">IDEMPOTENCY KEY</span>
                    <code>{{ b.idempotencyKey.slice(0, 16) }}...</code>
                  </div>
                </div>

                <div class="pass-seats-row">
                  <span class="pm-lbl">RESERVED SEATS ({{ b.seats.length }})</span>
                  <div class="seat-chips">
                    @for (s of b.seats; track s.label) {
                      <span class="seat-chip">
                        <strong>{{ s.label }}</strong> • {{ s.tierName }} (\${{ s.price }})
                      </span>
                    }
                  </div>
                </div>

                <div class="pass-actions">
                  <button
                    class="btn btn-secondary btn-sm"
                    (click)="toggleSagaTrace(b.id)"
                  >
                    {{ expandedSagaId() === b.id ? 'Hide Saga Trace ▲' : 'View Saga Choreography Trace ▼' }}
                  </button>

                  @if (b.status === 'CONFIRMED') {
                    <button
                      class="btn btn-danger btn-sm"
                      (click)="bookingService.cancelBooking(b.id)"
                    >
                      Cancel & Release Seats
                    </button>
                  }
                </div>

                @if (expandedSagaId() === b.id) {
                  <div class="saga-trace-box animate-scale">
                    <span class="pm-lbl">DISTRIBUTED SAGA EVENT LOG</span>
                    @for (step of b.sagaSteps; track step.id) {
                      <div class="st-row">
                        <span class="st-ok">✓</span>
                        <span class="st-svc">{{ step.service }}</span>
                        <span>{{ step.action }}</span>
                        @if (step.timestamp) {
                          <span class="st-ms">{{ step.timestamp }}</span>
                        }
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Perforated Divider -->
              <div class="pass-perforation">
                <div class="notch top"></div>
                <div class="dashed-line"></div>
                <div class="notch bottom"></div>
              </div>

              <!-- Right QR Stub -->
              <div class="pass-qr">
                <div class="qr-frame">
                  <svg viewBox="0 0 100 100" class="qr-svg">
                    <rect x="8" y="8" width="26" height="26" fill="none" stroke="currentColor" stroke-width="6"/>
                    <rect x="16" y="16" width="10" height="10" fill="currentColor"/>
                    <rect x="66" y="8" width="26" height="26" fill="none" stroke="currentColor" stroke-width="6"/>
                    <rect x="74" y="16" width="10" height="10" fill="currentColor"/>
                    <rect x="8" y="66" width="26" height="26" fill="none" stroke="currentColor" stroke-width="6"/>
                    <rect x="16" y="74" width="10" height="10" fill="currentColor"/>
                    <rect x="42" y="12" width="8" height="8" fill="currentColor"/>
                    <rect x="52" y="22" width="8" height="16" fill="currentColor"/>
                    <rect x="42" y="42" width="16" height="16" fill="currentColor"/>
                    <rect x="12" y="44" width="20" height="8" fill="currentColor"/>
                    <rect x="66" y="44" width="12" height="8" fill="currentColor"/>
                    <rect x="82" y="54" width="10" height="16" fill="currentColor"/>
                    <rect x="44" y="66" width="10" height="24" fill="currentColor"/>
                    <rect x="62" y="72" width="18" height="10" fill="currentColor"/>
                    <rect x="76" y="84" width="14" height="8" fill="currentColor"/>
                  </svg>
                </div>
                <span class="qr-ref">{{ b.bookingReference }}</span>
                <div class="qr-total">
                  <span>TOTAL PAID</span>
                  <strong>\${{ b.grandTotal | number: '1.2-2' }}</strong>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .bookings-page {
      padding-top: 2.25rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 2.25rem;

      h1 {
        font-family: var(--font-display);
        font-size: 2.25rem;
        margin: 0.5rem 0 0.3rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.95rem;
      }
    }

    .filter-tabs {
      display: flex;
      gap: 0.4rem;
      background: rgba(255, 255, 255, 0.04);
      padding: 0.35rem;
      border-radius: var(--radius-pill);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .tab-btn {
      padding: 0.45rem 1.1rem;
      border-radius: var(--radius-pill);
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;

      &.active {
        background: var(--grad-primary);
        color: #fff;
      }
    }

    .empty-wallet {
      text-align: center;
      padding: 4rem 2rem;
      max-width: 600px;
      margin: 2rem auto;

      .ew-icon {
        font-size: 3.5rem;
        margin-bottom: 1rem;
      }

      h2 {
        font-family: var(--font-display);
        margin-bottom: 0.6rem;
      }

      p {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
      }
    }

    .tickets-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .ticket-pass {
      display: grid;
      grid-template-columns: 230px 1fr 28px 200px;
      overflow: hidden;

      &.cancelled {
        opacity: 0.68;
      }
    }

    .pass-media {
      position: relative;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .pass-media-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, rgba(7, 8, 13, 0.1) 0%, rgba(14, 17, 26, 0.85) 100%);
      }

      .pass-cat {
        position: absolute;
        top: 1rem;
        left: 1rem;
      }
    }

    .pass-main {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .pass-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .ref-code {
        font-family: var(--font-mono);
        font-size: 0.8rem;
        font-weight: 700;
        color: #38bdf8;
      }
    }

    .pass-title {
      font-family: var(--font-display);
      font-size: 1.4rem;

      a:hover {
        color: #c4b5fd;
      }
    }

    .pass-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.85rem;

      div {
        display: flex;
        flex-direction: column;
      }

      strong {
        font-size: 0.86rem;
      }

      code {
        font-family: var(--font-mono);
        font-size: 0.78rem;
        color: var(--text-secondary);
      }
    }

    .pm-lbl {
      font-family: var(--font-mono);
      font-size: 0.66rem;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 0.2rem;
    }

    .seat-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-top: 0.25rem;
    }

    .seat-chip {
      font-size: 0.8rem;
      padding: 0.3rem 0.7rem;
      border-radius: 8px;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.35);
      color: #e2e8f0;
    }

    .pass-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .saga-trace-box {
      padding: 0.85rem 1rem;
      border-radius: 10px;
      background: rgba(7, 8, 13, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      .st-row {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        font-size: 0.78rem;
      }

      .st-ok {
        color: #34d399;
        font-weight: 700;
      }

      .st-svc {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        color: #c4b5fd;
      }

      .st-ms {
        margin-left: auto;
        font-family: var(--font-mono);
        color: var(--text-muted);
      }
    }

    /* Perforated Stub Line */
    .pass-perforation {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;

      .dashed-line {
        flex: 1;
        width: 2px;
        border-left: 2px dashed rgba(255, 255, 255, 0.14);
      }

      .notch {
        width: 24px;
        height: 12px;
        background: var(--bg-deep);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .notch.top {
        border-radius: 0 0 12px 12px;
        border-top: none;
      }

      .notch.bottom {
        border-radius: 12px 12px 0 0;
        border-bottom: none;
      }
    }

    .pass-qr {
      padding: 1.5rem 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: rgba(7, 8, 13, 0.45);

      .qr-frame {
        width: 112px;
        height: 112px;
        padding: 0.55rem;
        border-radius: 12px;
        background: #f8fafc;
        color: #090d16;
        margin-bottom: 0.65rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      }

      .qr-svg {
        width: 100%;
        height: 100%;
      }

      .qr-ref {
        font-family: var(--font-mono);
        font-size: 0.76rem;
        color: var(--text-secondary);
        margin-bottom: 0.65rem;
      }

      .qr-total {
        display: flex;
        flex-direction: column;

        span {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        strong {
          font-family: var(--font-display);
          font-size: 1.25rem;
          color: #34d399;
        }
      }
    }

    @media (max-width: 900px) {
      .ticket-pass {
        grid-template-columns: 1fr;
      }
      .pass-media {
        height: 160px;
      }
      .pass-perforation {
        display: none;
      }
    }
  `],
})
export class MyBookingsComponent {
  readonly bookingService = inject(BookingService);
  readonly eventService = inject(EventService);

  readonly statusFilter = signal<string>('ALL');
  readonly expandedSagaId = signal<string | null>(null);

  readonly filteredBookings = computed(() => {
    const all = this.bookingService.userBookings();
    const f = this.statusFilter();
    if (f === 'ALL') return all;
    return all.filter((b) => b.status === f);
  });

  toggleSagaTrace(id: string): void {
    this.expandedSagaId.update((curr) => (curr === id ? null : id));
  }
}
