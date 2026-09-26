import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, switchMap, tap } from 'rxjs';
import { ConfigService } from '../config/config.service';
import {
  EventDetail,
  EventRequest,
  EventSummary,
  EventUpdateRequest,
  PageResponse,
  VenueRequest,
  VenueResponse,
} from '../models/event.models';
import { AuthService } from './auth.service';

export interface EventVisualMeta {
  bannerUrl: string;
  accentGradient: string;
  badgeIcon: string;
  minPriceHint: number;
  highlightTag: string;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly auth = inject(AuthService);

  readonly loading = signal<boolean>(false);

  searchEvents(filters: {
    q?: string;
    category?: string;
    city?: string;
    from?: string;
    page?: number;
    size?: number;
  }): Observable<PageResponse<EventSummary>> {
    let params = new HttpParams()
      .set('page', String(filters.page ?? 0))
      .set('size', String(filters.size ?? 24));

    if (filters.q?.trim()) {
      params = params.set('q', filters.q.trim());
    }
    if (filters.category?.trim() && filters.category !== 'ALL') {
      params = params.set('category', filters.category.trim());
    }
    if (filters.city?.trim() && filters.city !== 'ALL') {
      params = params.set('city', filters.city.trim());
    }
    if (filters.from?.trim()) {
      params = params.set('from', filters.from.trim());
    }

    return this.http.get<PageResponse<EventSummary>>(
      `${this.config.apiUrl}/events`,
      { params }
    );
  }

  getMyEvents(page = 0, size = 30): Observable<PageResponse<EventSummary>> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<PageResponse<EventSummary>>(
      `${this.config.apiUrl}/events/mine`,
      { params }
    );
  }

  getEventById(id: string): Observable<EventDetail> {
    return this.http.get<EventDetail>(`${this.config.apiUrl}/events/${id}`);
  }

  createEvent(req: EventRequest): Observable<EventDetail> {
    return this.http.post<EventDetail>(`${this.config.apiUrl}/events`, req);
  }

  updateEvent(id: string, req: EventUpdateRequest): Observable<EventDetail> {
    return this.http.put<EventDetail>(`${this.config.apiUrl}/events/${id}`, req);
  }

  publishEvent(id: string): Observable<EventDetail> {
    return this.http.post<EventDetail>(
      `${this.config.apiUrl}/events/${id}/publish`,
      {}
    );
  }

  cancelEvent(id: string): Observable<EventDetail> {
    return this.http.post<EventDetail>(
      `${this.config.apiUrl}/events/${id}/cancel`,
      {}
    );
  }

  getVenues(): Observable<VenueResponse[]> {
    return this.http.get<VenueResponse[]>(`${this.config.apiUrl}/venues`);
  }

  createVenue(req: VenueRequest): Observable<VenueResponse> {
    return this.http.post<VenueResponse>(`${this.config.apiUrl}/venues`, req);
  }

  getVisualMeta(title: string, category: string): EventVisualMeta {
    const cat = (category || 'MUSIC').toUpperCase();
    const lowerTitle = (title || '').toLowerCase();

    if (lowerTitle.includes('symphony') || lowerTitle.includes('orchestra')) {
      return {
        bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
        accentGradient: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
        badgeIcon: '🎼',
        minPriceHint: 65,
        highlightTag: 'Dolby Live Acoustics',
      };
    }

    switch (cat) {
      case 'MUSIC':
      case 'FESTIVAL':
        return {
          bannerUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80',
          accentGradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          badgeIcon: '🎸',
          minPriceHint: 49,
          highlightTag: 'High Demand • 360° Stage',
        };
      case 'TECH':
      case 'CONFERENCE':
        return {
          bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
          accentGradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
          badgeIcon: '⚡',
          minPriceHint: 120,
          highlightTag: 'Keynote + VIP Lounge',
        };
      case 'SPORTS':
        return {
          bannerUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
          accentGradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
          badgeIcon: '🏆',
          minPriceHint: 55,
          highlightTag: 'Championship Arena',
        };
      case 'THEATER':
      case 'ARTS':
        return {
          bannerUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80',
          accentGradient: 'linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%)',
          badgeIcon: '🎭',
          minPriceHint: 75,
          highlightTag: 'Royal Box Seating',
        };
      case 'COMEDY':
        return {
          bannerUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1200&q=80',
          accentGradient: 'linear-gradient(135deg, #f59e0b 0%, #8b5cf6 100%)',
          badgeIcon: '🎤',
          minPriceHint: 35,
          highlightTag: 'Live Standup Special',
        };
      default:
        return {
          bannerUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
          accentGradient: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
          badgeIcon: '✨',
          minPriceHint: 45,
          highlightTag: 'Verified Live Event',
        };
    }
  }

  /**
   * Seeds realistic venues & published events into PostgreSQL via the API Gateway.
   */
  seedSampleCatalog(): Observable<EventDetail[]> {
    const ensureOrganizer$ = this.auth.isOrganizer()
      ? of(this.auth.currentUser())
      : this.auth.quickDemoLogin('ORGANIZER');

    return ensureOrganizer$.pipe(
      switchMap(() => this.getVenues()),
      switchMap((existingVenues) => {
        if (existingVenues.length >= 3) {
          return of(existingVenues);
        }
        const sampleVenues: VenueRequest[] = [
          {
            name: 'Lotus Arena & Dome',
            city: 'Colombo',
            address: 'Lotus Tower Boulevard, Colombo 01',
            capacity: 5000,
          },
          {
            name: 'CyberSphere Convention Center',
            city: 'Singapore',
            address: '10 Bayfront Avenue, Marina Bay',
            capacity: 3500,
          },
          {
            name: 'Apex Grand Stadium',
            city: 'London',
            address: 'Olympic Way, Wembley Park',
            capacity: 8000,
          },
          {
            name: 'Nelum Pokuna Royal Theatre',
            city: 'Colombo',
            address: '110 Ananda Coomaraswamy Mawatha',
            capacity: 1280,
          },
        ];
        return forkJoin(sampleVenues.map((v) => this.createVenue(v)));
      }),
      switchMap((venues) => {
        const v1 = venues[0];
        const v2 = venues[1] || venues[0];
        const v3 = venues[2] || venues[0];
        const v4 = venues[3] || venues[0];

        const futureDate = (daysAhead: number, hour: number) => {
          const d = new Date(Date.now() + daysAhead * 86400000);
          d.setUTCHours(hour, 0, 0, 0);
          return d.toISOString().slice(0, 19);
        };

        const sampleEvents: EventRequest[] = [
          {
            title: 'Neon Pulse: Synthwave World Tour 2027',
            description:
              'Experience an immersive 360-degree audiovisual cyberpunk concert featuring holographic laser stages, spatial Dolby Atmos sound, and live electronic orchestras.',
            category: 'MUSIC',
            venueId: v1.id,
            startsAt: futureDate(14, 19),
            endsAt: futureDate(14, 23),
            ticketTypes: [
              { name: 'VIP Front Row Pit', price: 149.0, quantity: 120 },
              { name: 'Golden Circle Arena', price: 89.0, quantity: 400 },
              { name: 'Grandstand Tier A', price: 49.0, quantity: 800 },
            ],
          },
          {
            title: 'CloudNative & AI Systems Summit',
            description:
              'Deep-dive keynotes on Kubernetes autoscaling (HPA), distributed Saga choreography, OpenTelemetry tracing, and high-throughput event-driven architectures.',
            category: 'TECH',
            venueId: v2.id,
            startsAt: futureDate(21, 9),
            endsAt: futureDate(21, 18),
            ticketTypes: [
              { name: 'Executive All-Access Pass', price: 299.0, quantity: 100 },
              { name: 'Developer Full Pass', price: 149.0, quantity: 500 },
              { name: 'Expo & Keynote Seat', price: 69.0, quantity: 600 },
            ],
          },
          {
            title: 'Champions Masters Final: Global Esports Arena',
            description:
              'The ultimate championship clash under high-traffic stadium lights. Witness the top international rosters battle live on the main stage.',
            category: 'SPORTS',
            venueId: v3.id,
            startsAt: futureDate(30, 17),
            endsAt: futureDate(30, 22),
            ticketTypes: [
              { name: 'Floor Legends VIP Box', price: 195.0, quantity: 150 },
              { name: 'Lower Bowl Ringside', price: 110.0, quantity: 600 },
              { name: 'Upper Deck Fan Zone', price: 55.0, quantity: 1200 },
            ],
          },
          {
            title: 'Symphony of Stars: Hans Zimmer Tribute',
            description:
              'A 75-piece philharmonic orchestra and choir performing iconic cinematic scores from Interstellar, Inception, Dune, and The Dark Knight.',
            category: 'THEATER',
            venueId: v4.id,
            startsAt: futureDate(18, 20),
            endsAt: futureDate(18, 22),
            ticketTypes: [
              { name: 'Royal Orchestra Box', price: 135.0, quantity: 80 },
              { name: 'Mezzanine Premier', price: 85.0, quantity: 300 },
              { name: 'Balcony Acoustic', price: 50.0, quantity: 400 },
            ],
          },
          {
            title: 'Midnight Laughs: Global Stand-Up Gala',
            description:
              'An unforgettable evening of sharp observational comedy and crowd work featuring five international headliners.',
            category: 'COMEDY',
            venueId: v1.id,
            startsAt: futureDate(10, 20),
            endsAt: futureDate(10, 22),
            ticketTypes: [
              { name: 'Front Table VIP', price: 79.0, quantity: 80 },
              { name: 'Main Floor Reserved', price: 45.0, quantity: 350 },
            ],
          },
          {
            title: 'Horizon Electronic Sunset Festival',
            description:
              'Three stages of progressive house, melodic techno, and live visual art installations from sunset to midnight.',
            category: 'FESTIVAL',
            venueId: v2.id,
            startsAt: futureDate(40, 16),
            endsAt: futureDate(40, 23),
            ticketTypes: [
              { name: 'Backstage SkyDeck VIP', price: 220.0, quantity: 120 },
              { name: 'Mainstage Priority', price: 115.0, quantity: 500 },
              { name: 'General Festival Pass', price: 65.0, quantity: 900 },
            ],
          },
        ];

        return forkJoin(
          sampleEvents.map((req) =>
            this.createEvent(req).pipe(
              switchMap((created) => this.publishEvent(created.id))
            )
          )
        );
      })
    );
  }
}
