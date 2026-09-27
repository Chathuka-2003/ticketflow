import { Injectable, computed, inject, signal } from '@angular/core';
import { ConfigService } from '../config/config.service';
import { EventDetail, TicketTypeResponse } from '../models/event.models';
import {
  BookingRecord,
  SagaEventStep,
  SeatHoldSession,
  SeatNode,
} from '../models/booking.models';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

const HOLD_STORAGE_KEY = 'ticketflow_active_seat_hold';
const BOOKINGS_STORAGE_KEY = 'ticketflow_bookings_v1';
const LOCKED_SEATS_KEY = 'ticketflow_sold_seats_v1';

const TIER_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly config = inject(ConfigService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly activeHold = signal<SeatHoldSession | null>(this.loadStoredHold());
  readonly remainingHoldSeconds = signal<number>(0);
  readonly bookings = signal<BookingRecord[]>(this.loadStoredBookings());

  readonly formattedHoldTimer = computed(() => {
    const secs = this.remainingHoldSeconds();
    if (secs <= 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  readonly userBookings = computed(() => {
    const user = this.auth.currentUser();
    const all = this.bookings();
    if (!user) return all;
    return all.filter(
      (b) => b.userId === user.id || b.userEmail.toLowerCase() === user.email.toLowerCase()
    );
  });

  private timerHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHoldCountdownLoop();
  }

  /**
   * Builds a deterministic interactive seat map from an EventDetail's ticketTypes.
   */
  generateSeatMap(event: EventDetail): SeatNode[] {
    const seats: SeatNode[] = [];
    const soldSet = this.getSoldSeatsForEvent(event.id);
    const currentHold = this.activeHold();
    const heldLabels = new Set(
      currentHold && currentHold.eventId === event.id
        ? currentHold.seats.map((s) => s.label)
        : []
    );

    const tiers: TicketTypeResponse[] =
      event.ticketTypes && event.ticketTypes.length > 0
        ? event.ticketTypes
        : [
            { id: 'vip', name: 'VIP Front Row', price: 120, quantity: 24 },
            { id: 'gold', name: 'Golden Circle', price: 75, quantity: 36 },
            { id: 'std', name: 'Grandstand Reserved', price: 45, quantity: 48 },
          ];

    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
    let rowIdx = 0;

    tiers.forEach((tier, tIndex) => {
      const color = TIER_COLORS[tIndex % TIER_COLORS.length];
      const rowsForTier = tIndex === 0 ? 2 : tIndex === 1 ? 3 : 3;
      const seatsPerRow = 12;

      for (let r = 0; r < rowsForTier && rowIdx < rowLetters.length; r++) {
        const rowChar = rowLetters[rowIdx++];
        for (let num = 1; num <= seatsPerRow; num++) {
          const label = `${rowChar}${num}`;
          const seedHash = this.hashCode(`${event.id}-${label}`);
          let status: SeatNode['status'] = 'AVAILABLE';

          if (soldSet.has(label)) {
            status = 'SOLD';
          } else if (heldLabels.has(label)) {
            status = 'SELECTED';
          } else if (seedHash % 7 === 0) {
            status = 'SOLD';
          } else if (seedHash % 13 === 0) {
            status = 'HELD_OTHER';
          }

          seats.push({
            id: `${event.id}-${label}`,
            row: rowChar,
            number: num,
            label,
            tierId: tier.id,
            tierName: tier.name,
            price: Number(tier.price),
            color,
            status,
          });
        }
      }
    });

    return seats;
  }

  /**
   * Acquires a 10-minute Redis-style seat hold lock (TTL = 600s).
   */
  createSeatHold(event: EventDetail, selectedSeats: SeatNode[]): SeatHoldSession {
    const now = Date.now();
    const ttlMs = (this.config.seatHoldTtlSeconds || 600) * 1000;
    const totalAmount = selectedSeats.reduce((sum, s) => sum + Number(s.price), 0);
    const serviceFee = Math.round(totalAmount * 0.08 * 100) / 100;
    const grandTotal = Math.round((totalAmount + serviceFee) * 100) / 100;

    const holdId = `HOLD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const seatKeyPart = selectedSeats.map((s) => s.label).join(',');

    const session: SeatHoldSession = {
      holdId,
      redisKey: `seat:lock:${event.id}:[${seatKeyPart}]`,
      eventId: event.id,
      eventTitle: event.title,
      eventStartsAt: event.startsAt,
      venueName: event.venue?.name || 'Main Arena',
      city: event.venue?.city || 'Colombo',
      category: event.category,
      seats: selectedSeats,
      totalAmount,
      serviceFee,
      grandTotal,
      createdAt: now,
      expiresAt: now + ttlMs,
      idempotencyKey: this.generateUuid(),
    };

    this.activeHold.set(session);
    this.remainingHoldSeconds.set(Math.floor(ttlMs / 1000));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify(session));
    }
    return session;
  }

  releaseHold(notify = true): void {
    this.activeHold.set(null);
    this.remainingHoldSeconds.set(0);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(HOLD_STORAGE_KEY);
    }
    if (notify) {
      this.toast.info('Seat Lock Released', 'Your Redis seat hold has been released.');
    }
  }

  /**
   * Completes booking after Saga execution (Confirming seats or releasing them on failure).
   */
  finalizeBooking(
    hold: SeatHoldSession,
    paymentMethod: string,
    sagaSteps: SagaEventStep[],
    succeeded: boolean
  ): BookingRecord {
    const user = this.auth.currentUser();
    const record: BookingRecord = {
      id: this.generateUuid(),
      bookingReference: `TF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      userId: user?.id || 'guest',
      userEmail: user?.email || 'guest@ticketflow.io',
      eventId: hold.eventId,
      eventTitle: hold.eventTitle,
      eventCategory: hold.category,
      eventStartsAt: hold.eventStartsAt,
      venueName: hold.venueName,
      city: hold.city,
      seats: hold.seats.map((s) => ({
        label: s.label,
        tierName: s.tierName,
        price: s.price,
      })),
      totalAmount: hold.totalAmount,
      serviceFee: hold.serviceFee,
      grandTotal: hold.grandTotal,
      status: succeeded ? 'CONFIRMED' : 'PAYMENT_FAILED',
      idempotencyKey: hold.idempotencyKey,
      paymentMethod,
      createdAt: new Date().toISOString(),
      sagaSteps,
    };

    if (succeeded) {
      this.markSeatsSold(
        hold.eventId,
        hold.seats.map((s) => s.label)
      );
      this.bookings.update((prev) => [record, ...prev]);
      this.persistBookings();
      this.releaseHold(false);
    } else {
      // Saga compensation: release seat hold
      this.releaseHold(false);
    }

    return record;
  }

  cancelBooking(bookingId: string): void {
    const target = this.bookings().find((b) => b.id === bookingId);
    if (!target) return;

    this.unmarkSeatsSold(
      target.eventId,
      target.seats.map((s) => s.label)
    );

    this.bookings.update((list) =>
      list.map((b) =>
        b.id === bookingId ? { ...b, status: 'CANCELLED' } : b
      )
    );
    this.persistBookings();
    this.toast.info(
      'Booking Cancelled',
      `Booking ${target.bookingReference} cancelled & seats released back to inventory.`
    );
  }

  private startHoldCountdownLoop(): void {
    if (typeof window === 'undefined') return;
    const syncTimer = () => {
      const hold = this.activeHold();
      if (!hold) {
        this.remainingHoldSeconds.set(0);
        return;
      }
      const diffSec = Math.floor((hold.expiresAt - Date.now()) / 1000);
      if (diffSec <= 0) {
        this.activeHold.set(null);
        this.remainingHoldSeconds.set(0);
        localStorage.removeItem(HOLD_STORAGE_KEY);
        this.toast.warning(
          'Seat Hold Expired',
          'Your 10-minute Redis seat lock expired and seats were returned to the pool.'
        );
      } else {
        this.remainingHoldSeconds.set(diffSec);
      }
    };

    syncTimer();
    this.timerHandle = setInterval(syncTimer, 1000);
  }

  private loadStoredHold(): SeatHoldSession | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(HOLD_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SeatHoldSession;
      if (parsed.expiresAt <= Date.now()) {
        localStorage.removeItem(HOLD_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private loadStoredBookings(): BookingRecord[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as BookingRecord[]) : [];
    } catch {
      return [];
    }
  }

  private persistBookings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(this.bookings()));
    } catch {
      // ignore
    }
  }

  private getSoldSeatsForEvent(eventId: string): Set<string> {
    if (typeof localStorage === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(LOCKED_SEATS_KEY);
      if (!raw) return new Set();
      const mapObj = JSON.parse(raw) as Record<string, string[]>;
      return new Set(mapObj[eventId] || []);
    } catch {
      return new Set();
    }
  }

  private markSeatsSold(eventId: string, labels: string[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOCKED_SEATS_KEY);
      const mapObj: Record<string, string[]> = raw ? JSON.parse(raw) : {};
      const existing = new Set(mapObj[eventId] || []);
      labels.forEach((l) => existing.add(l));
      mapObj[eventId] = Array.from(existing);
      localStorage.setItem(LOCKED_SEATS_KEY, JSON.stringify(mapObj));
    } catch {
      // ignore
    }
  }

  private unmarkSeatsSold(eventId: string, labels: string[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOCKED_SEATS_KEY);
      if (!raw) return;
      const mapObj: Record<string, string[]> = JSON.parse(raw);
      const removeSet = new Set(labels);
      mapObj[eventId] = (mapObj[eventId] || []).filter((l) => !removeSet.has(l));
      localStorage.setItem(LOCKED_SEATS_KEY, JSON.stringify(mapObj));
    } catch {
      // ignore
    }
  }

  private hashCode(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
