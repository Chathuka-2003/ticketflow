import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { EventSummary } from '../../../core/models/event.models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  template: `
    <!-- Hero Spotlight Section -->
    <section class="hero-section">
      <div class="hero-glow hero-glow-1"></div>
      <div class="hero-glow hero-glow-2"></div>

      <div class="tf-container hero-grid">
        <div class="hero-copy animate-fade-up">
          <div class="hero-pill">
            <span class="live-dot"></span>
            <span>HIGH-CONCURRENCY SEAT RESERVATION & SAGA CHOREOGRAPHY</span>
          </div>

          <h1 class="hero-title">
            Book Unforgettable
            <span class="text-gradient">Live Experiences</span>
            in Real Time.
          </h1>

          <p class="hero-subtitle">
            Powered by distributed <strong>Redis 10-minute seat locks</strong>,
            idempotent payment processing, and <strong>RabbitMQ event choreography</strong>
            behind Spring Cloud Gateway.
          </p>

          <!-- Search & Filter Bar -->
          <div class="search-bar glass-card">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (keyup.enter)="loadEvents()"
                placeholder="Search concerts, tech summits, artists, or arenas..."
                class="search-field"
              />
              @if (searchQuery) {
                <button class="clear-btn" (click)="clearSearch()">✕</button>
              }
            </div>

            <div class="search-divider"></div>

            <div class="city-select-wrap">
              <span class="loc-icon">📍</span>
              <select [(ngModel)]="selectedCity" (change)="loadEvents()" class="city-select">
                <option value="ALL">All Cities</option>
                @for (city of availableCities(); track city) {
                  <option [value]="city">{{ city }}</option>
                }
              </select>
            </div>

            <button class="btn btn-primary search-submit" (click)="loadEvents()">
              Explore Events
            </button>
          </div>

          <!-- Quick Platform Metrics -->
          <div class="hero-stats">
            <div class="stat-item">
              <span class="stat-val">{{ totalElements() || events().length }}</span>
              <span class="stat-lbl">Published Events</span>
            </div>
            <div class="stat-sep"></div>
            <div class="stat-item">
              <span class="stat-val">10m TTL</span>
              <span class="stat-lbl">Redis Seat Lock</span>
            </div>
            <div class="stat-sep"></div>
            <div class="stat-item">
              <span class="stat-val">RS256</span>
              <span class="stat-lbl">JWKS OAuth2 Guard</span>
            </div>
          </div>
        </div>

        <!-- Animated Floating Showcase Card -->
        <div class="hero-visual animate-fade-up stagger-2">
          <div class="floating-ticket glass-card">
            <div class="ft-header">
              <span class="badge badge-published">● LIVE SAGA PIPELINE</span>
              <span class="ft-code">REDIS LOCK #TF-2027</span>
            </div>
            <div class="ft-art">
              <img
                src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80"
                alt="Live Concert Stage"
              />
              <div class="ft-overlay">
                <span class="ft-tag">🎸 360° Spatial Audio Arena</span>
                <h3>Neon Pulse: Synthwave World Tour</h3>
                <p>Lotus Arena & Dome • VIP Front Row Pit</p>
              </div>
            </div>
            <div class="ft-saga-strip">
              <div class="saga-node done">
                <span class="s-dot">✓</span>
                <span>Seat Held</span>
              </div>
              <div class="saga-line"></div>
              <div class="saga-node done">
                <span class="s-dot">✓</span>
                <span>RabbitMQ</span>
              </div>
              <div class="saga-line"></div>
              <div class="saga-node active">
                <span class="s-dot">⚡</span>
                <span>Payment</span>
              </div>
              <div class="saga-line"></div>
              <div class="saga-node">
                <span class="s-dot">✉</span>
                <span>Ticket QR</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Category Pills & Catalog Toolbar -->
    <section class="catalog-section tf-container">
      <div class="catalog-header">
        <div class="category-pills">
          @for (cat of categories; track cat.id) {
            <button
              class="cat-pill"
              [class.active]="selectedCategory === cat.id"
              (click)="selectCategory(cat.id)"
            >
              <span>{{ cat.icon }}</span>
              <span>{{ cat.label }}</span>
            </button>
          }
        </div>

        <div class="catalog-actions">
          <button
            class="btn btn-secondary btn-sm"
            [disabled]="seeding()"
            (click)="seedDemoCatalog()"
            title="Seed sample venues and published events into PostgreSQL"
          >
            @if (seeding()) {
              <span>⏳ Seeding PostgreSQL...</span>
            } @else {
              <span>🌱 Seed Sample Events</span>
            }
          </button>
        </div>
      </div>

      <!-- Loading Skeletons -->
      @if (loading()) {
        <div class="events-grid">
          @for (item of [1, 2, 3, 4, 5, 6]; track item) {
            <div class="event-card skeleton-card glass-card">
              <div class="skeleton-banner"></div>
              <div class="skeleton-body">
                <div class="sk-line sk-w40"></div>
                <div class="sk-line sk-w80"></div>
                <div class="sk-line sk-w60"></div>
              </div>
            </div>
          }
        </div>
      } @else if (events().length === 0) {
        <!-- Empty State with 1-Click Database Seeder -->
        <div class="empty-state glass-card animate-scale">
          <div class="empty-icon">🎪</div>
          <h2>No Published Events Found Matching Your Filters</h2>
          <p>
            Populate the PostgreSQL <code>event_db</code> database with 6 realistic concerts,
            tech conferences, and stadium championship events in one click, or create custom
            events in the Organizer Studio.
          </p>
          <div class="empty-buttons">
            <button
              class="btn btn-primary btn-lg"
              [disabled]="seeding()"
              (click)="seedDemoCatalog()"
            >
              @if (seeding()) {
                <span>⏳ Creating Venues & Events in PostgreSQL...</span>
              } @else {
                <span>⚡ Populate Live Demo Catalog Now</span>
              }
            </button>
            @if (searchQuery || selectedCategory !== 'ALL' || selectedCity !== 'ALL') {
              <button class="btn btn-secondary btn-lg" (click)="resetAllFilters()">
                Reset Search Filters
              </button>
            }
          </div>
        </div>
      } @else {
        <!-- Events Grid -->
        <div class="events-grid">
          @for (ev of events(); track ev.id; let idx = $index) {
            @let meta = eventService.getVisualMeta(ev.title, ev.category);
            <article
              class="event-card glass-card glass-card-interactive animate-fade-up"
              [style.animation-delay]="(idx % 6) * 0.06 + 's'"
            >
              <div class="card-media">
                <img [src]="meta.bannerUrl" [alt]="ev.title" loading="lazy" />
                <div class="card-media-overlay"></div>

                <div class="card-top-badges">
                  <span class="badge badge-category">
                    {{ meta.badgeIcon }} {{ ev.category }}
                  </span>
                  <span class="badge badge-published">
                    ● {{ ev.status }}
                  </span>
                </div>

                <div class="card-date-chip">
                  <span class="m">{{ ev.startsAt | date: 'MMM' }}</span>
                  <span class="d">{{ ev.startsAt | date: 'dd' }}</span>
                </div>
              </div>

              <div class="card-body">
                <div class="vibe-tag">{{ meta.highlightTag }}</div>
                <h3 class="card-title">{{ ev.title }}</h3>

                <div class="card-meta">
                  <div class="meta-row">
                    <span class="m-icon">📍</span>
                    <span>{{ ev.venueName }} • <strong>{{ ev.city }}</strong></span>
                  </div>
                  <div class="meta-row">
                    <span class="m-icon">🕒</span>
                    <span>{{ ev.startsAt | date: 'EEE, MMM d, y • h:mm a' }}</span>
                  </div>
                </div>

                <div class="card-footer">
                  <div class="price-block">
                    <span class="price-label">Starting from</span>
                    <span class="price-val">\${{ meta.minPriceHint }}.00</span>
                  </div>

                  <a [routerLink]="['/events', ev.id]" class="btn btn-primary btn-sm select-btn">
                    <span>Select Seats</span>
                    <span class="arrow">→</span>
                  </a>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .hero-section {
      position: relative;
      padding: 3.5rem 0 3rem;
      overflow: hidden;
    }

    .hero-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(110px);
      pointer-events: none;
      z-index: 0;
    }

    .hero-glow-1 {
      width: 480px;
      height: 480px;
      background: rgba(139, 92, 246, 0.22);
      top: -120px;
      left: -80px;
    }

    .hero-glow-2 {
      width: 420px;
      height: 420px;
      background: rgba(236, 72, 153, 0.16);
      top: 40px;
      right: -100px;
    }

    .hero-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1.25fr 0.9fr;
      gap: 3rem;
      align-items: center;
    }

    .hero-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.95rem;
      border-radius: var(--radius-pill);
      background: rgba(139, 92, 246, 0.14);
      border: 1px solid rgba(139, 92, 246, 0.35);
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 600;
      color: #ddd6fe;
      margin-bottom: 1.35rem;
    }

    .hero-title {
      font-family: var(--font-display);
      font-size: clamp(2.4rem, 4.5vw, 3.85rem);
      font-weight: 700;
      line-height: 1.08;
      letter-spacing: -0.03em;
      margin-bottom: 1.15rem;
    }

    .hero-subtitle {
      font-size: 1.06rem;
      color: var(--text-secondary);
      max-width: 620px;
      margin-bottom: 2rem;

      strong {
        color: var(--text-primary);
        font-weight: 600;
      }
    }

    .search-bar {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      gap: 0.5rem;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-lg);
      box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.7);
    }

    .search-input-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0 0.85rem;
    }

    .search-field {
      width: 100%;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 0.95rem;
      padding: 0.6rem 0;

      &:focus {
        outline: none;
      }
    }

    .clear-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: var(--text-secondary);
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
    }

    .search-divider {
      width: 1px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
    }

    .city-select-wrap {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0 0.65rem;
    }

    .city-select {
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 0.5rem 0.25rem;

      &:focus {
        outline: none;
      }

      option {
        background: #0f172a;
      }
    }

    .hero-stats {
      display: flex;
      align-items: center;
      gap: 1.75rem;
      margin-top: 2rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
    }

    .stat-val {
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 700;
      color: #fff;
    }

    .stat-lbl {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .stat-sep {
      width: 1px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Floating Ticket Showcase */
    .floating-ticket {
      padding: 1.25rem;
      animation: floatSlow 6s ease-in-out infinite;
      border: 1px solid rgba(139, 92, 246, 0.35);
      box-shadow: 0 25px 60px -15px rgba(139, 92, 246, 0.3);
    }

    .ft-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.95rem;
    }

    .ft-code {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .ft-art {
      position: relative;
      border-radius: var(--radius-md);
      overflow: hidden;
      height: 250px;
      margin-bottom: 1.1rem;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s ease;
      }

      &:hover img {
        transform: scale(1.06);
      }
    }

    .ft-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(7, 8, 13, 0.1) 0%, rgba(7, 8, 13, 0.92) 100%);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 1.25rem;

      .ft-tag {
        font-size: 0.75rem;
        color: #f472b6;
        font-weight: 700;
        margin-bottom: 0.25rem;
      }

      h3 {
        font-family: var(--font-display);
        font-size: 1.28rem;
        margin-bottom: 0.2rem;
      }

      p {
        font-size: 0.84rem;
        color: var(--text-secondary);
      }
    }

    .ft-saga-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(7, 8, 13, 0.6);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .saga-node {
      display: flex;
      align-items: center;
      gap: 0.38rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);

      .s-dot {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 0.68rem;
        background: rgba(255, 255, 255, 0.08);
      }

      &.done {
        color: #34d399;
        .s-dot {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
      }

      &.active {
        color: #c4b5fd;
        .s-dot {
          background: rgba(139, 92, 246, 0.35);
          color: #fff;
        }
      }
    }

    .saga-line {
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.12);
      margin: 0 0.4rem;
    }

    /* Catalog Toolbar */
    .catalog-section {
      padding-top: 1rem;
    }

    .catalog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .category-pills {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
    }

    .cat-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 1.1rem;
      border-radius: var(--radius-pill);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      color: var(--text-secondary);
      font-size: 0.86rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.22s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.09);
        color: #fff;
        transform: translateY(-1px);
      }

      &.active {
        background: var(--grad-primary);
        color: #fff;
        border-color: transparent;
        box-shadow: 0 6px 20px -4px rgba(236, 72, 153, 0.5);
      }
    }

    /* Events Grid */
    .events-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.75rem;
    }

    .event-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .card-media {
      position: relative;
      height: 220px;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
      }
    }

    .event-card:hover .card-media img {
      transform: scale(1.07);
    }

    .card-media-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(7, 8, 13, 0.35) 0%, rgba(14, 17, 26, 0.92) 100%);
    }

    .card-top-badges {
      position: absolute;
      top: 1rem;
      left: 1rem;
      right: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-date-chip {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 12px;
      padding: 0.4rem 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1.1;

      .m {
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #f472b6;
      }

      .d {
        font-family: var(--font-display);
        font-size: 1.25rem;
        font-weight: 700;
        color: #fff;
      }
    }

    .card-body {
      padding: 1.35rem 1.45rem 1.45rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .vibe-tag {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: #38bdf8;
      margin-bottom: 0.4rem;
    }

    .card-title {
      font-family: var(--font-display);
      font-size: 1.28rem;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 0.95rem;
    }

    .card-meta {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      margin-bottom: 1.35rem;
      color: var(--text-secondary);
      font-size: 0.88rem;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      strong {
        color: var(--text-primary);
      }
    }

    .card-footer {
      margin-top: auto;
      padding-top: 1.1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .price-block {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    .price-label {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .price-val {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 700;
      color: #fff;
    }

    .select-btn .arrow {
      transition: transform 0.22s ease;
    }

    .event-card:hover .select-btn .arrow {
      transform: translateX(4px);
    }

    /* Skeleton Loader */
    .skeleton-banner {
      height: 220px;
      background: linear-gradient(90deg, #151a28 25%, #1e293b 50%, #151a28 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
    }

    .skeleton-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .sk-line {
      height: 16px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.07);
    }
    .sk-w40 { width: 40%; }
    .sk-w80 { width: 85%; height: 22px; }
    .sk-w60 { width: 65%; }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      max-width: 680px;
      margin: 2rem auto;

      .empty-icon {
        font-size: 3.5rem;
        margin-bottom: 1rem;
      }

      h2 {
        font-family: var(--font-display);
        font-size: 1.65rem;
        margin-bottom: 0.75rem;
      }

      p {
        color: var(--text-secondary);
        margin-bottom: 1.75rem;
      }

      .empty-buttons {
        display: flex;
        justify-content: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
    }

    @media (max-width: 960px) {
      .hero-grid {
        grid-template-columns: 1fr;
      }
      .search-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .search-divider {
        display: none;
      }
      .events-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class EventListComponent implements OnInit {
  readonly eventService = inject(EventService);
  private readonly toast = inject(ToastService);

  readonly events = signal<EventSummary[]>([]);
  readonly totalElements = signal<number>(0);
  readonly loading = signal<boolean>(true);
  readonly seeding = signal<boolean>(false);

  searchQuery = '';
  selectedCategory = 'ALL';
  selectedCity = 'ALL';

  readonly categories = [
    { id: 'ALL', label: 'All Experiences', icon: '✨' },
    { id: 'MUSIC', label: 'Concerts & Music', icon: '🎸' },
    { id: 'TECH', label: 'Tech & AI Summits', icon: '⚡' },
    { id: 'SPORTS', label: 'Sports & Esports', icon: '🏆' },
    { id: 'THEATER', label: 'Theater & Symphony', icon: '🎭' },
    { id: 'COMEDY', label: 'Stand-up Comedy', icon: '🎤' },
    { id: 'FESTIVAL', label: 'Festivals', icon: '🎆' },
  ];

  readonly availableCities = computed(() => {
    const cities = new Set<string>(['Colombo', 'Singapore', 'London']);
    this.events().forEach((e) => {
      if (e.city) cities.add(e.city);
    });
    return Array.from(cities);
  });

  ngOnInit(): void {
    this.loadEvents(true);
  }

  loadEvents(autoSeedIfEmpty = false): void {
    this.loading.set(true);
    this.eventService
      .searchEvents({
        q: this.searchQuery,
        category: this.selectedCategory,
        city: this.selectedCity,
        size: 30,
      })
      .subscribe({
        next: (page) => {
          this.events.set(page.content);
          this.totalElements.set(page.totalElements);
          this.loading.set(false);

          if (
            autoSeedIfEmpty &&
            page.totalElements === 0 &&
            !this.searchQuery &&
            this.selectedCategory === 'ALL' &&
            this.selectedCity === 'ALL'
          ) {
            this.seedDemoCatalog();
          }
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(
            'Gateway Connection Warning',
            'Could not reach /api/events. Ensure api-gateway & event-service are running.'
          );
        },
      });
  }

  selectCategory(catId: string): void {
    this.selectedCategory = catId;
    this.loadEvents();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadEvents();
  }

  resetAllFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = 'ALL';
    this.selectedCity = 'ALL';
    this.loadEvents();
  }

  seedDemoCatalog(): void {
    if (this.seeding()) return;
    this.seeding.set(true);
    this.eventService.seedSampleCatalog().subscribe({
      next: (created) => {
        this.seeding.set(false);
        this.toast.success(
          'PostgreSQL Catalog Seeded!',
          `Created & published ${created.length} live events across 4 venues.`
        );
        this.loadEvents(false);
      },
      error: (err) => {
        this.seeding.set(false);
        this.toast.error(
          'Seed Operation Failed',
          err?.error?.detail || 'Could not seed sample events.'
        );
      },
    });
  }
}
