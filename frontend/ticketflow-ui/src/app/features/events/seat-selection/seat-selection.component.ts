import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { BookingService } from '../../../core/services/booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { EventDetail } from '../../../core/models/event.models';
import { SeatNode } from '../../../core/models/booking.models';

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    @if (loading()) {
      <div class="tf-container loading-wrap">
        <div class="glass-card loading-box">
          <div class="spinner"></div>
          <p>Loading event arena & real-time seat inventory...</p>
        </div>
      </div>
    } @else if (event(); as ev) {
      @let meta = eventService.getVisualMeta(ev.title, ev.category);

      <!-- Event Hero Banner -->
      <section class="event-banner">
        <div class="banner-bg">
          <img [src]="meta.bannerUrl" [alt]="ev.title" />
          <div class="banner-overlay"></div>
        </div>

        <div class="tf-container banner-content animate-fade-up">
          <a routerLink="/" class="back-link">← Back to All Events</a>

          <div class="banner-badges">
            <span class="badge badge-category">{{ meta.badgeIcon }} {{ ev.category }}</span>
            <span class="badge badge-published">● {{ ev.status }}</span>
            <span class="capacity-pill">🏟️ Capacity: {{ ev.venue.capacity | number }}</span>
          </div>

          <h1 class="event-title">{{ ev.title }}</h1>
          <p class="event-desc">{{ ev.description }}</p>

          <div class="event-info-strip glass-card">
            <div class="info-item">
              <span class="i-icon">📍</span>
              <div>
                <span class="i-label">Venue & Location</span>
                <strong>{{ ev.venue.name }} • {{ ev.venue.city }}</strong>
                <small>{{ ev.venue.address }}</small>
              </div>
            </div>

            <div class="info-item">
              <span class="i-icon">📅</span>
              <div>
                <span class="i-label">Show Starts</span>
                <strong>{{ ev.startsAt | date: 'EEEE, MMM d, y' }}</strong>
                <small>{{ ev.startsAt | date: 'h:mm a' }} – {{ ev.endsAt | date: 'h:mm a' }}</small>
              </div>
            </div>

            <div class="info-item">
              <span class="i-icon">🔒</span>
              <div>
                <span class="i-label">Concurrency Protection</span>
                <strong>Redis 10-Min Seat Lock</strong>
                <small>Atomic hold prevents double booking</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Interactive Seat Map & Summary Grid -->
      <section class="tf-container seat-workspace">
        <!-- Left: Arena Stage & Seat Matrix -->
        <div class="arena-panel glass-card animate-fade-up stagger-1">
          <div class="arena-toolbar">
            <div>
              <h2>Interactive Arena Seat Map</h2>
              <p>Select up to 8 seats. Selected seats are locked in Redis for 10 minutes at checkout.</p>
            </div>
            <div class="toolbar-actions">
              <button class="btn btn-secondary btn-sm" (click)="autoPickBestSeats(2)">
                ✨ Best 2 Together
              </button>
              @if (selectedSeats().length > 0) {
                <button class="btn btn-danger btn-sm" (click)="clearSelection()">
                  Clear ({{ selectedSeats().length }})
                </button>
              }
            </div>
          </div>

          <!-- Tier Filter Legend -->
          <div class="tier-legend">
            <button
              class="tier-chip"
              [class.active]="highlightedTier() === 'ALL'"
              (click)="highlightedTier.set('ALL')"
            >
              All Tiers
            </button>
            @for (tier of tierSummaries(); track tier.name) {
              <button
                class="tier-chip"
                [class.active]="highlightedTier() === tier.name"
                (click)="highlightedTier.set(tier.name)"
              >
                <span class="tier-dot" [style.background]="tier.color"></span>
                <span>{{ tier.name }}</span>
                <strong>\${{ tier.price }}</strong>
              </button>
            }
          </div>

          <!-- Illuminated Stage Visual -->
          <div class="stage-container">
            <div class="stage-arc">
              <span>MAIN STAGE • 360° PRODUCTION</span>
            </div>
            <div class="stage-glow"></div>
          </div>

          <!-- Seat Rows -->
          <div class="seat-rows-wrapper">
            @for (rowGroup of groupedRows(); track rowGroup.row) {
              <div class="seat-row">
                <span class="row-label">{{ rowGroup.row }}</span>

                <div class="row-seats">
                  @for (seat of rowGroup.seats; track seat.id) {
                    @if (seat.number === 4 || seat.number === 10) {
                      <div class="aisle-spacer"></div>
                    }
                    <button
                      type="button"
                      class="seat-btn"
                      [class.selected]="seat.status === 'SELECTED'"
                      [class.sold]="seat.status === 'SOLD'"
                      [class.held-other]="seat.status === 'HELD_OTHER'"
                      [class.dimmed]="highlightedTier() !== 'ALL' && highlightedTier() !== seat.tierName"
                      [style.--seat-color]="seat.color"
                      [disabled]="seat.status === 'SOLD' || seat.status === 'HELD_OTHER'"
                      [title]="seat.label + ' • ' + seat.tierName + ' ($' + seat.price + ') - ' + seat.status"
                      (click)="toggleSeat(seat)"
                    >
                      <span class="seat-num">{{ seat.label }}</span>
                    </button>
                  }
                </div>

                <span class="row-label">{{ rowGroup.row }}</span>
              </div>
            }
          </div>

          <!-- Seat Status Legend -->
          <div class="status-legend">
            <div class="s-item">
              <span class="s-box available"></span>
              <span>Available</span>
            </div>
            <div class="s-item">
              <span class="s-box selected"></span>
              <span>Your Selection</span>
            </div>
            <div class="s-item">
              <span class="s-box held"></span>
              <span>Held (Redis TTL Lock)</span>
            </div>
            <div class="s-item">
              <span class="s-box sold"></span>
              <span>Sold Out</span>
            </div>
          </div>
        </div>

        <!-- Right: Sticky Booking Summary & Redis Hold Trigger -->
        <aside class="summary-sidebar glass-card animate-fade-up stagger-2">
          <div class="sidebar-header">
            <h3>Reservation Summary</h3>
            <span class="redis-badge">⚡ REDIS LOCK READY</span>
          </div>

          <!-- Official Event Ticket Tiers from Backend -->
          <div class="official-tiers">
            <span class="section-lbl">OFFICIAL TICKET TIERS</span>
            @for (t of ev.ticketTypes; track t.id) {
              <div class="official-tier-row">
                <div>
                  <strong>{{ t.name }}</strong>
                  <small>{{ t.quantity }} total allocation</small>
                </div>
                <span class="t-price">\${{ t.price | number: '1.2-2' }}</span>
              </div>
            }
          </div>

          <div class="divider-h"></div>

          @if (selectedSeats().length === 0) {
            <div class="no-seats-box">
              <div class="ns-icon">🎟️</div>
              <p>Click on any glowing seat in the arena map to reserve your spot.</p>
              <button class="btn btn-secondary btn-sm" (click)="autoPickBestSeats(2)">
                Auto-Select 2 Best Seats
              </button>
            </div>
          } @else {
            <div class="selected-list">
              <span class="section-lbl">SELECTED SEATS ({{ selectedSeats().length }}/8)</span>
              @for (s of selectedSeats(); track s.id) {
                <div class="selected-item animate-scale">
                  <div class="s-left">
                    <span class="s-seat-badge" [style.background]="s.color">{{ s.label }}</span>
                    <div>
                      <strong>{{ s.tierName }}</strong>
                      <small>Row {{ s.row }} • Seat {{ s.number }}</small>
                    </div>
                  </div>
                  <div class="s-right">
                    <span>\${{ s.price | number: '1.2-2' }}</span>
                    <button class="remove-seat" (click)="toggleSeat(s)" title="Remove seat">✕</button>
                  </div>
                </div>
              }
            </div>

            <div class="price-breakdown">
              <div class="p-row">
                <span>Tickets Subtotal ({{ selectedSeats().length }})</span>
                <span>\${{ subtotal() | number: '1.2-2' }}</span>
              </div>
              <div class="p-row">
                <span>Platform & Service Fee (8%)</span>
                <span>\${{ serviceFee() | number: '1.2-2' }}</span>
              </div>
              <div class="p-row total">
                <span>Total Due</span>
                <span class="text-gradient">\${{ grandTotal() | number: '1.2-2' }}</span>
              </div>
            </div>

            <button class="btn btn-primary btn-lg full-btn" (click)="lockSeatsAndProceed()">
              <span>🔒 Hold Seats (10:00) & Checkout</span>
            </button>

            <p class="hold-disclaimer">
              Clicking above acquires an exclusive <strong>10-minute Redis TTL lock</strong>
              on your selected seats and generates an idempotency key.
            </p>
          }
        </aside>
      </section>
    }
  `,
  styles: [`
    .loading-wrap {
      padding: 5rem 1.5rem;
    }
    .loading-box {
      padding: 4rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .spinner {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 3px solid rgba(139, 92, 246, 0.25);
      border-top-color: #ec4899;
      animation: spinSlow 0.85s linear infinite;
    }

    .event-banner {
      position: relative;
      padding: 2.5rem 0 2.5rem;
      overflow: hidden;
    }

    .banner-bg {
      position: absolute;
      inset: 0;
      z-index: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: blur(16px) brightness(0.35);
        transform: scale(1.08);
      }

      .banner-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(7, 8, 13, 0.45) 0%, var(--bg-deep) 100%);
      }
    }

    .banner-content {
      position: relative;
      z-index: 1;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 1.25rem;
      transition: color 0.2s ease;

      &:hover {
        color: #fff;
      }
    }

    .banner-badges {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
      margin-bottom: 0.9rem;
    }

    .capacity-pill {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-pill);
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
    }

    .event-title {
      font-family: var(--font-display);
      font-size: clamp(2rem, 3.6vw, 3rem);
      font-weight: 700;
      margin-bottom: 0.65rem;
    }

    .event-desc {
      color: var(--text-secondary);
      max-width: 820px;
      font-size: 1rem;
      margin-bottom: 1.75rem;
    }

    .event-info-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      padding: 1.25rem 1.5rem;
      background: rgba(15, 23, 42, 0.78);
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;

      .i-icon {
        font-size: 1.4rem;
        background: rgba(139, 92, 246, 0.15);
        width: 42px;
        height: 42px;
        border-radius: 10px;
        display: grid;
        place-items: center;
      }

      div {
        display: flex;
        flex-direction: column;
      }

      .i-label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      strong {
        font-size: 0.95rem;
        color: #fff;
      }

      small {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }
    }

    /* Seat Workspace */
    .seat-workspace {
      display: grid;
      grid-template-columns: 1fr 390px;
      gap: 2rem;
      align-items: start;
      margin-top: 0.5rem;
    }

    .arena-panel {
      padding: 1.75rem;
    }

    .arena-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.35rem;

      h2 {
        font-family: var(--font-display);
        font-size: 1.35rem;
      }

      p {
        font-size: 0.86rem;
        color: var(--text-secondary);
      }

      .toolbar-actions {
        display: flex;
        gap: 0.6rem;
      }
    }

    .tier-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      margin-bottom: 2rem;
    }

    .tier-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.9rem;
      border-radius: var(--radius-pill);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.2s ease;

      &.active {
        background: rgba(139, 92, 246, 0.22);
        border-color: var(--accent-primary);
        color: #fff;
      }

      .tier-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
    }

    /* Stage Arc */
    .stage-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 2.2rem;
    }

    .stage-arc {
      width: 78%;
      height: 46px;
      border-radius: 50% 50% 12px 12px / 100% 100% 12px 12px;
      background: linear-gradient(180deg, rgba(139, 92, 246, 0.45) 0%, rgba(236, 72, 153, 0.15) 100%);
      border-top: 3px solid #ec4899;
      display: grid;
      place-items: center;
      font-family: var(--font-mono);
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      color: #f8fafc;
      box-shadow: 0 12px 40px -6px rgba(236, 72, 153, 0.45);
    }

    /* Seat Grid */
    .seat-rows-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      align-items: center;
      overflow-x: auto;
      padding: 0.5rem 0 1.5rem;
    }

    .seat-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .row-label {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      width: 20px;
      text-align: center;
    }

    .row-seats {
      display: flex;
      align-items: center;
      gap: 0.42rem;
    }

    .aisle-spacer {
      width: 16px;
    }

    .seat-btn {
      width: 36px;
      height: 34px;
      border-radius: 8px 8px 5px 5px;
      border: 1.5px solid var(--seat-color, #8b5cf6);
      background: color-mix(in srgb, var(--seat-color, #8b5cf6) 18%, transparent);
      color: #f8fafc;
      font-family: var(--font-mono);
      font-size: 0.68rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
                  background 0.18s ease,
                  box-shadow 0.18s ease,
                  opacity 0.2s ease;

      &:hover:not(:disabled) {
        transform: translateY(-3px) scale(1.1);
        background: color-mix(in srgb, var(--seat-color, #8b5cf6) 45%, transparent);
        box-shadow: 0 6px 15px -3px var(--seat-color, #8b5cf6);
      }

      &.selected {
        background: var(--grad-primary);
        border-color: #fff;
        color: #fff;
        transform: scale(1.12);
        box-shadow: 0 0 16px rgba(236, 72, 153, 0.75);
      }

      &.held-other {
        background: rgba(245, 158, 11, 0.16);
        border-color: rgba(245, 158, 11, 0.4);
        color: #fbbf24;
        cursor: not-allowed;
        opacity: 0.65;
      }

      &.sold {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.22);
        cursor: not-allowed;
      }

      &.dimmed {
        opacity: 0.22;
      }
    }

    .status-legend {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .s-item {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .s-box {
      width: 16px;
      height: 16px;
      border-radius: 4px;

      &.available {
        border: 1.5px solid #8b5cf6;
        background: rgba(139, 92, 246, 0.2);
      }
      &.selected {
        background: var(--grad-primary);
        border: 1px solid #fff;
      }
      &.held {
        background: rgba(245, 158, 11, 0.25);
        border: 1px solid #f59e0b;
      }
      &.sold {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
    }

    /* Sidebar */
    .summary-sidebar {
      position: sticky;
      top: 96px;
      padding: 1.5rem;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.15rem;

      h3 {
        font-family: var(--font-display);
        font-size: 1.2rem;
      }
    }

    .redis-badge {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.16);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }

    .section-lbl {
      display: block;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 0.65rem;
    }

    .official-tiers {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .official-tier-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.03);

      div {
        display: flex;
        flex-direction: column;
      }

      strong {
        font-size: 0.85rem;
      }

      small {
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      .t-price {
        font-family: var(--font-mono);
        font-weight: 700;
        color: #c4b5fd;
      }
    }

    .divider-h {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 1.15rem 0;
    }

    .no-seats-box {
      text-align: center;
      padding: 1.75rem 1rem;
      color: var(--text-secondary);
      font-size: 0.88rem;

      .ns-icon {
        font-size: 2.2rem;
        margin-bottom: 0.5rem;
      }

      p {
        margin-bottom: 1rem;
      }
    }

    .selected-list {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      margin-bottom: 1.25rem;
      max-height: 240px;
      overflow-y: auto;
    }

    .selected-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 0.75rem;
      border-radius: 10px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.28);

      .s-left {
        display: flex;
        align-items: center;
        gap: 0.65rem;

        div {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        strong {
          font-size: 0.84rem;
        }

        small {
          font-size: 0.72rem;
          color: var(--text-secondary);
        }
      }

      .s-seat-badge {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.3rem 0.5rem;
        border-radius: 6px;
        color: #fff;
      }

      .s-right {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        font-family: var(--font-mono);
        font-weight: 700;
        font-size: 0.88rem;
      }

      .remove-seat {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 0.85rem;

        &:hover {
          color: #f43f5e;
        }
      }
    }

    .price-breakdown {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      padding: 1rem;
      border-radius: 12px;
      background: rgba(7, 8, 13, 0.55);
      margin-bottom: 1.25rem;
      font-size: 0.88rem;

      .p-row {
        display: flex;
        justify-content: space-between;
        color: var(--text-secondary);

        &.total {
          padding-top: 0.55rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
        }
      }
    }

    .full-btn {
      width: 100%;
    }

    .hold-disclaimer {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
      margin-top: 0.85rem;
      line-height: 1.45;
    }

    @media (max-width: 1024px) {
      .seat-workspace {
        grid-template-columns: 1fr;
      }
      .summary-sidebar {
        position: static;
      }
    }
  `],
})
export class SeatSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly eventService = inject(EventService);
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly event = signal<EventDetail | null>(null);
  readonly seats = signal<SeatNode[]>([]);
  readonly loading = signal<boolean>(true);
  readonly highlightedTier = signal<string>('ALL');

  readonly selectedSeats = computed(() =>
    this.seats().filter((s) => s.status === 'SELECTED')
  );

  readonly subtotal = computed(() =>
    this.selectedSeats().reduce((acc, s) => acc + s.price, 0)
  );

  readonly serviceFee = computed(
    () => Math.round(this.subtotal() * 0.08 * 100) / 100
  );

  readonly grandTotal = computed(
    () => Math.round((this.subtotal() + this.serviceFee()) * 100) / 100
  );

  readonly tierSummaries = computed(() => {
    const map = new Map<string, { name: string; price: number; color: string }>();
    this.seats().forEach((s) => {
      if (!map.has(s.tierName)) {
        map.set(s.tierName, {
          name: s.tierName,
          price: s.price,
          color: s.color,
        });
      }
    });
    return Array.from(map.values());
  });

  readonly groupedRows = computed(() => {
    const groups = new Map<string, SeatNode[]>();
    this.seats().forEach((s) => {
      const list = groups.get(s.row) || [];
      list.push(s);
      groups.set(s.row, list);
    });
    return Array.from(groups.entries()).map(([row, seats]) => ({ row, seats }));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    this.eventService.getEventById(id).subscribe({
      next: (detail) => {
        this.event.set(detail);
        this.seats.set(this.bookingService.generateSeatMap(detail));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Event Not Found', 'Could not load the requested event.');
        this.router.navigate(['/']);
      },
    });
  }

  toggleSeat(target: SeatNode): void {
    if (target.status === 'SOLD' || target.status === 'HELD_OTHER') return;

    const currentSelected = this.selectedSeats();
    if (target.status === 'AVAILABLE' && currentSelected.length >= 8) {
      this.toast.warning('Maximum 8 Seats', 'You can reserve up to 8 seats per booking.');
      return;
    }

    this.seats.update((all) =>
      all.map((s) =>
        s.id === target.id
          ? { ...s, status: s.status === 'SELECTED' ? 'AVAILABLE' : 'SELECTED' }
          : s
      )
    );
  }

  autoPickBestSeats(count: number): void {
    const available = this.seats().filter((s) => s.status === 'AVAILABLE');
    if (available.length < count) {
      this.toast.warning('Limited Availability', 'Not enough available seats.');
      return;
    }
    const pickedIds = new Set(available.slice(0, count).map((s) => s.id));
    this.seats.update((all) =>
      all.map((s) => {
        if (s.status === 'SELECTED') return { ...s, status: 'AVAILABLE' };
        if (pickedIds.has(s.id)) return { ...s, status: 'SELECTED' };
        return s;
      })
    );
  }

  clearSelection(): void {
    this.seats.update((all) =>
      all.map((s) => (s.status === 'SELECTED' ? { ...s, status: 'AVAILABLE' } : s))
    );
  }

  lockSeatsAndProceed(): void {
    const ev = this.event();
    const chosen = this.selectedSeats();
    if (!ev || chosen.length === 0) return;

    const proceedWithHold = () => {
      const hold = this.bookingService.createSeatHold(ev, chosen);
      this.toast.success(
        'Redis Seat Lock Acquired (10m TTL)',
        `Locked ${chosen.map((s) => s.label).join(', ')} under key ${hold.holdId}`
      );
      this.router.navigate(['/checkout', ev.id]);
    };

    if (!this.authService.isAuthenticated()) {
      this.authService.quickDemoLogin('USER').subscribe({
        next: () => proceedWithHold(),
        error: () => {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: `/events/${ev.id}` },
          });
        },
      });
    } else {
      proceedWithHold();
    }
  }
}
