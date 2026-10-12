import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  EventSummary,
  TicketTypeRequest,
  VenueResponse,
} from '../../../core/models/event.models';

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  template: `
    <div class="tf-container organizer-page">
      <!-- Top Header -->
      <div class="studio-header animate-fade-up">
        <div>
          <div class="role-guard-pill">
            <span>🛡️ PROTECTED ROUTE • ROLE_ORGANIZER / ROLE_ADMIN VERIFIED</span>
          </div>
          <h1>Organizer Studio & Event Control</h1>
          <p>
            Create venues, configure multi-tier ticket allocations, and publish live events
            to PostgreSQL via <code>event-service</code>.
          </p>
        </div>

        <div class="studio-actions">
          <button
            class="btn btn-secondary"
            (click)="showVenueModal.set(!showVenueModal())"
          >
            🏟️ + New Venue
          </button>
          <button
            class="btn btn-cyber"
            [disabled]="seeding()"
            (click)="seedCatalog()"
          >
            {{ seeding() ? '⏳ Seeding...' : '🌱 Seed 6 Sample Events' }}
          </button>
        </div>
      </div>

      <!-- KPI Metrics Strip -->
      <div class="kpi-grid animate-fade-up stagger-1">
        <div class="kpi-card glass-card">
          <span class="kpi-lbl">Total Managed Events</span>
          <strong class="kpi-val">{{ myEvents().length }}</strong>
          <small>Owned by {{ authService.currentUser()?.email }}</small>
        </div>
        <div class="kpi-card glass-card">
          <span class="kpi-lbl">Published & Live</span>
          <strong class="kpi-val emerald">{{ publishedCount() }}</strong>
          <small>Indexed in public search</small>
        </div>
        <div class="kpi-card glass-card">
          <span class="kpi-lbl">Drafts Pending</span>
          <strong class="kpi-val amber">{{ draftCount() }}</strong>
          <small>Hidden until published</small>
        </div>
        <div class="kpi-card glass-card">
          <span class="kpi-lbl">Registered Venues</span>
          <strong class="kpi-val cyan">{{ venues().length }}</strong>
          <small>Available arenas & halls</small>
        </div>
      </div>

      <!-- Optional New Venue Drawer -->
      @if (showVenueModal()) {
        <div class="venue-drawer glass-card animate-scale">
          <div class="vd-top">
            <h3>Create New Venue (POST /api/venues)</h3>
            <button class="btn btn-secondary btn-sm" (click)="showVenueModal.set(false)">
              Close ✕
            </button>
          </div>
          <div class="vd-grid">
            <div class="form-group">
              <label>Venue Name *</label>
              <input
                type="text"
                class="tf-input"
                [(ngModel)]="newVenue.name"
                placeholder="e.g. Grand Sapphire Arena"
              />
            </div>
            <div class="form-group">
              <label>City *</label>
              <input
                type="text"
                class="tf-input"
                [(ngModel)]="newVenue.city"
                placeholder="e.g. Colombo"
              />
            </div>
            <div class="form-group">
              <label>Street Address</label>
              <input
                type="text"
                class="tf-input"
                [(ngModel)]="newVenue.address"
                placeholder="e.g. 42 Marine Drive"
              />
            </div>
            <div class="form-group">
              <label>Max Capacity *</label>
              <input
                type="number"
                class="tf-input"
                [(ngModel)]="newVenue.capacity"
                min="50"
              />
            </div>
          </div>
          <div class="vd-actions">
            <button
              class="btn btn-primary"
              [disabled]="creatingVenue()"
              (click)="submitNewVenue()"
            >
              {{ creatingVenue() ? 'Saving Venue...' : 'Save Venue to PostgreSQL' }}
            </button>
          </div>
        </div>
      }

      <!-- Main Studio Workspace: Left Create Form, Right My Events List -->
      <div class="studio-workspace">
        <!-- Create Event Form -->
        <section class="create-panel glass-card animate-fade-up stagger-2">
          <h2>Create New Event</h2>
          <p class="sub">
            Events are created in <code>DRAFT</code> status or can be auto-published immediately.
          </p>

          <div class="form-stack">
            <div class="form-group">
              <label>Event Title *</label>
              <input
                type="text"
                class="tf-input"
                [(ngModel)]="eventForm.title"
                placeholder="e.g. Aurora Live: Electronic Symphony 2027"
              />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>Category *</label>
                <select class="tf-select" [(ngModel)]="eventForm.category">
                  <option value="MUSIC">MUSIC</option>
                  <option value="TECH">TECH</option>
                  <option value="SPORTS">SPORTS</option>
                  <option value="THEATER">THEATER</option>
                  <option value="COMEDY">COMEDY</option>
                  <option value="FESTIVAL">FESTIVAL</option>
                </select>
              </div>

              <div class="form-group">
                <label>Venue *</label>
                <select class="tf-select" [(ngModel)]="eventForm.venueId">
                  @for (v of venues(); track v.id) {
                    <option [value]="v.id">
                      {{ v.name }} ({{ v.city }} • Cap: {{ v.capacity }})
                    </option>
                  }
                </select>
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>Starts At (Future) *</label>
                <input
                  type="datetime-local"
                  class="tf-input"
                  [(ngModel)]="eventForm.startsAt"
                />
              </div>

              <div class="form-group">
                <label>Ends At *</label>
                <input
                  type="datetime-local"
                  class="tf-input"
                  [(ngModel)]="eventForm.endsAt"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Event Description</label>
              <textarea
                rows="3"
                class="tf-textarea"
                [(ngModel)]="eventForm.description"
                placeholder="Describe stage setup, headliners, VIP perks, and schedule..."
              ></textarea>
            </div>

            <!-- Dynamic Ticket Tiers -->
            <div class="tiers-box">
              <div class="tiers-header">
                <div>
                  <span class="section-lbl">TICKET TIERS & PRICING</span>
                  <small class="cap-indicator" [class.exceeded]="capacityExceeded()">
                    Allocated: {{ totalAllocatedTickets() }} / {{ selectedVenueCapacity() }} seats
                  </small>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="addTier()">
                  + Add Tier
                </button>
              </div>

              @for (tier of ticketTiers(); track $index; let i = $index) {
                <div class="tier-input-row">
                  <input
                    type="text"
                    class="tf-input"
                    [(ngModel)]="tier.name"
                    placeholder="Tier name (e.g. VIP Pit)"
                  />
                  <input
                    type="number"
                    class="tf-input"
                    [(ngModel)]="tier.price"
                    min="0"
                    step="5"
                    placeholder="Price ($)"
                  />
                  <input
                    type="number"
                    class="tf-input"
                    [(ngModel)]="tier.quantity"
                    min="1"
                    placeholder="Qty"
                  />
                  @if (ticketTiers().length > 1) {
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      (click)="removeTier(i)"
                    >
                      ✕
                    </button>
                  }
                </div>
              }
            </div>

            <label class="checkbox-row">
              <input type="checkbox" [(ngModel)]="autoPublishOnCreate" />
              <span>Immediately publish event after creation (POST /publish)</span>
            </label>

            <button
              class="btn btn-primary btn-lg"
              [disabled]="submittingEvent() || capacityExceeded()"
              (click)="createEvent()"
            >
              @if (submittingEvent()) {
                <span>⏳ Saving to PostgreSQL...</span>
              } @else if (autoPublishOnCreate) {
                <span>🚀 Create & Publish Live Event</span>
              } @else {
                <span>📝 Save as Draft Event</span>
              }
            </button>
          </div>
        </section>

        <!-- Organizer's Managed Events List -->
        <section class="managed-panel glass-card animate-fade-up stagger-3">
          <div class="mp-header">
            <h2>My Events (/api/events/mine)</h2>
            <button class="btn btn-secondary btn-sm" (click)="loadOrganizerData()">
              ↻ Refresh
            </button>
          </div>

          @if (myEvents().length === 0) {
            <div class="empty-mine">
              <p>You haven't created any events under this organizer account yet.</p>
              <button class="btn btn-cyber btn-sm" (click)="seedCatalog()">
                ⚡ Seed 6 Sample Events Now
              </button>
            </div>
          } @else {
            <div class="mine-list">
              @for (ev of myEvents(); track ev.id) {
                <div class="mine-item">
                  <div class="mi-info">
                    <div class="mi-badges">
                      <span class="badge badge-category">{{ ev.category }}</span>
                      <span
                        class="badge"
                        [class.badge-published]="ev.status === 'PUBLISHED'"
                        [class.badge-draft]="ev.status === 'DRAFT'"
                        [class.badge-cancelled]="ev.status === 'CANCELLED'"
                      >
                        ● {{ ev.status }}
                      </span>
                    </div>
                    <h4>
                      <a [routerLink]="['/events', ev.id]">{{ ev.title }}</a>
                    </h4>
                    <p>
                      📍 {{ ev.venueName }} ({{ ev.city }}) •
                      🕒 {{ ev.startsAt | date: 'MMM d, y, h:mm a' }}
                    </p>
                  </div>

                  <div class="mi-actions">
                    @if (ev.status === 'DRAFT') {
                      <button
                        class="btn btn-primary btn-sm"
                        (click)="publishEvent(ev.id)"
                      >
                        Publish Live
                      </button>
                    }
                    @if (ev.status === 'PUBLISHED') {
                      <a
                        [routerLink]="['/events', ev.id]"
                        class="btn btn-secondary btn-sm"
                      >
                        View Arena
                      </a>
                    }
                    @if (ev.status !== 'CANCELLED') {
                      <button
                        class="btn btn-danger btn-sm"
                        (click)="cancelEvent(ev.id)"
                      >
                        Cancel
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .organizer-page {
      padding-top: 2.25rem;
    }

    .studio-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 2rem;

      h1 {
        font-family: var(--font-display);
        font-size: 2.2rem;
        margin: 0.45rem 0 0.3rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.95rem;
      }
    }

    .role-guard-pill {
      display: inline-flex;
      padding: 0.3rem 0.75rem;
      border-radius: var(--radius-pill);
      background: rgba(16, 185, 129, 0.14);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 700;
    }

    .studio-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .kpi-card {
      padding: 1.35rem 1.5rem;
      display: flex;
      flex-direction: column;

      .kpi-lbl {
        font-size: 0.78rem;
        color: var(--text-secondary);
      }

      .kpi-val {
        font-family: var(--font-display);
        font-size: 2.1rem;
        margin: 0.25rem 0;

        &.emerald { color: #34d399; }
        &.amber { color: #fbbf24; }
        &.cyan { color: #38bdf8; }
      }

      small {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
    }

    .venue-drawer {
      padding: 1.5rem;
      margin-bottom: 2rem;
      border-color: rgba(6, 182, 212, 0.4);

      .vd-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.15rem;
      }

      .vd-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.15rem;
      }

      .vd-actions {
        display: flex;
        justify-content: flex-end;
      }
    }

    .studio-workspace {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 2rem;
      align-items: start;
    }

    .create-panel,
    .managed-panel {
      padding: 1.75rem;

      h2 {
        font-family: var(--font-display);
        font-size: 1.35rem;
        margin-bottom: 0.3rem;
      }

      .sub {
        font-size: 0.86rem;
        color: var(--text-secondary);
        margin-bottom: 1.35rem;
      }
    }

    .form-stack {
      display: flex;
      flex-direction: column;
      gap: 1.05rem;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .tiers-box {
      padding: 1.1rem;
      border-radius: var(--radius-md);
      background: rgba(7, 8, 13, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .tiers-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .section-lbl {
        display: block;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        color: #c4b5fd;
      }

      .cap-indicator {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: #34d399;

        &.exceeded {
          color: #f43f5e;
          font-weight: 700;
        }
      }
    }

    .tier-input-row {
      display: grid;
      grid-template-columns: 1.6fr 1fr 1fr auto;
      gap: 0.6rem;
      align-items: center;
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.88rem;
      color: var(--text-secondary);
      cursor: pointer;

      input {
        width: 17px;
        height: 17px;
        accent-color: #ec4899;
      }
    }

    .mp-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .empty-mine {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-secondary);

      p {
        margin-bottom: 1rem;
      }
    }

    .mine-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      max-height: 640px;
      overflow-y: auto;
    }

    .mine-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.15rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: border-color 0.2s ease;

      &:hover {
        border-color: rgba(139, 92, 246, 0.4);
      }

      .mi-badges {
        display: flex;
        gap: 0.45rem;
        margin-bottom: 0.4rem;
      }

      h4 {
        font-family: var(--font-display);
        font-size: 1.05rem;
        margin-bottom: 0.2rem;

        a:hover {
          color: #c4b5fd;
        }
      }

      p {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .mi-actions {
        display: flex;
        gap: 0.5rem;
        flex-shrink: 0;
      }
    }

    @media (max-width: 1024px) {
      .studio-workspace {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class OrganizerDashboardComponent implements OnInit {
  readonly eventService = inject(EventService);
  readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly venues = signal<VenueResponse[]>([]);
  readonly myEvents = signal<EventSummary[]>([]);
  readonly showVenueModal = signal<boolean>(false);
  readonly creatingVenue = signal<boolean>(false);
  readonly submittingEvent = signal<boolean>(false);
  readonly seeding = signal<boolean>(false);

  autoPublishOnCreate = true;

  newVenue = {
    name: '',
    city: 'Colombo',
    address: '',
    capacity: 2500,
  };

  eventForm = {
    title: '',
    category: 'MUSIC',
    venueId: '',
    startsAt: this.defaultFutureDate(15, 19),
    endsAt: this.defaultFutureDate(15, 23),
    description:
      'Live multi-sensory arena experience with spatial sound and reserved tiered seating.',
  };

  readonly ticketTiers = signal<TicketTypeRequest[]>([
    { name: 'VIP Front Row', price: 140, quantity: 100 },
    { name: 'Golden Circle', price: 85, quantity: 300 },
    { name: 'Standard Arena', price: 45, quantity: 500 },
  ]);

  readonly publishedCount = computed(
    () => this.myEvents().filter((e) => e.status === 'PUBLISHED').length
  );

  readonly draftCount = computed(
    () => this.myEvents().filter((e) => e.status === 'DRAFT').length
  );

  readonly selectedVenueCapacity = computed(() => {
    const v = this.venues().find((x) => x.id === this.eventForm.venueId);
    return v ? v.capacity : 5000;
  });

  readonly totalAllocatedTickets = computed(() =>
    this.ticketTiers().reduce((sum, t) => sum + (Number(t.quantity) || 0), 0)
  );

  readonly capacityExceeded = computed(
    () => this.totalAllocatedTickets() > this.selectedVenueCapacity()
  );

  ngOnInit(): void {
    this.loadOrganizerData();
  }

  loadOrganizerData(): void {
    this.eventService.getVenues().subscribe({
      next: (vList) => {
        this.venues.set(vList);
        if (vList.length > 0 && !this.eventForm.venueId) {
          this.eventForm.venueId = vList[0].id;
        }
      },
    });

    this.eventService.getMyEvents(0, 50).subscribe({
      next: (page) => {
        this.myEvents.set(page.content);
      },
    });
  }

  addTier(): void {
    this.ticketTiers.update((list) => [
      ...list,
      { name: `Tier ${list.length + 1}`, price: 50, quantity: 100 },
    ]);
  }

  removeTier(idx: number): void {
    this.ticketTiers.update((list) => list.filter((_, i) => i !== idx));
  }

  submitNewVenue(): void {
    if (!this.newVenue.name.trim() || !this.newVenue.city.trim()) {
      this.toast.warning('Missing Fields', 'Please enter venue name and city.');
      return;
    }
    this.creatingVenue.set(true);
    this.eventService.createVenue(this.newVenue).subscribe({
      next: (created) => {
        this.creatingVenue.set(false);
        this.showVenueModal.set(false);
        this.venues.update((prev) => [...prev, created]);
        this.eventForm.venueId = created.id;
        this.newVenue = { name: '', city: 'Colombo', address: '', capacity: 2500 };
        this.toast.success('Venue Created', `${created.name} saved to PostgreSQL.`);
      },
      error: (err) => {
        this.creatingVenue.set(false);
        this.toast.error('Failed to Create Venue', err?.error?.detail || 'Check inputs.');
      },
    });
  }

  createEvent(): void {
    if (!this.eventForm.title.trim()) {
      this.toast.warning('Title Required', 'Please provide an event title.');
      return;
    }
    if (!this.eventForm.venueId) {
      this.toast.warning('Venue Required', 'Please select or create a venue first.');
      return;
    }

    this.submittingEvent.set(true);
    const payload = {
      title: this.eventForm.title.trim(),
      description: this.eventForm.description.trim(),
      category: this.eventForm.category,
      venueId: this.eventForm.venueId,
      startsAt: this.normalizeIsoLocal(this.eventForm.startsAt),
      endsAt: this.normalizeIsoLocal(this.eventForm.endsAt),
      ticketTypes: this.ticketTiers(),
    };

    this.eventService.createEvent(payload).subscribe({
      next: (created) => {
        if (this.autoPublishOnCreate) {
          this.eventService.publishEvent(created.id).subscribe({
            next: () => {
              this.submittingEvent.set(false);
              this.eventForm.title = '';
              this.toast.success(
                'Event Created & Published!',
                `${created.title} is now live in the public catalog.`
              );
              this.loadOrganizerData();
            },
            error: () => {
              this.submittingEvent.set(false);
              this.loadOrganizerData();
            },
          });
        } else {
          this.submittingEvent.set(false);
          this.eventForm.title = '';
          this.toast.success('Draft Saved', `${created.title} saved as DRAFT.`);
          this.loadOrganizerData();
        }
      },
      error: (err) => {
        this.submittingEvent.set(false);
        this.toast.error(
          'Event Creation Failed',
          err?.error?.detail || 'Verify dates and venue capacity.'
        );
      },
    });
  }

  publishEvent(id: string): void {
    this.eventService.publishEvent(id).subscribe({
      next: (updated) => {
        this.toast.success('Event Published', `${updated.title} is now live!`);
        this.loadOrganizerData();
      },
      error: (err) => {
        this.toast.error('Publish Failed', err?.error?.detail || 'Could not publish.');
      },
    });
  }

  cancelEvent(id: string): void {
    this.eventService.cancelEvent(id).subscribe({
      next: (updated) => {
        this.toast.info('Event Cancelled', `${updated.title} marked as CANCELLED.`);
        this.loadOrganizerData();
      },
      error: (err) => {
        this.toast.error('Cancel Failed', err?.error?.detail || 'Could not cancel.');
      },
    });
  }

  seedCatalog(): void {
    this.seeding.set(true);
    this.eventService.seedSampleCatalog().subscribe({
      next: (created) => {
        this.seeding.set(false);
        this.toast.success(
          'Sample Catalog Seeded',
          `Added ${created.length} published events to PostgreSQL.`
        );
        this.loadOrganizerData();
      },
      error: () => {
        this.seeding.set(false);
      },
    });
  }

  private defaultFutureDate(daysAhead: number, hour: number): string {
    const d = new Date(Date.now() + daysAhead * 86400000);
    d.setHours(hour, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00`;
  }

  private normalizeIsoLocal(val: string): string {
    return val.length === 16 ? `${val}:00` : val;
  }
}
