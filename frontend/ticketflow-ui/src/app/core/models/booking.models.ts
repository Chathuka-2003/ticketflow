import { EventDetail, TicketTypeResponse } from './event.models';

export type SeatStatus = 'AVAILABLE' | 'SELECTED' | 'HELD_OTHER' | 'SOLD';

export interface SeatNode {
  id: string;
  row: string;
  number: number;
  label: string;
  tierId: string;
  tierName: string;
  price: number;
  color: string;
  status: SeatStatus;
}

export interface SeatHoldSession {
  holdId: string;
  redisKey: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  venueName: string;
  city: string;
  category: string;
  seats: SeatNode[];
  totalAmount: number;
  serviceFee: number;
  grandTotal: number;
  createdAt: number;
  expiresAt: number;
  idempotencyKey: string;
}

export type BookingStatus = 'CONFIRMED' | 'PAYMENT_FAILED' | 'CANCELLED';

export interface SagaEventStep {
  id: string;
  service: string;
  action: string;
  detail: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  timestamp?: string;
}

export interface BookingRecord {
  id: string;
  bookingReference: string;
  userId: string;
  userEmail: string;
  eventId: string;
  eventTitle: string;
  eventCategory: string;
  eventStartsAt: string;
  venueName: string;
  city: string;
  seats: {
    label: string;
    tierName: string;
    price: number;
  }[];
  totalAmount: number;
  serviceFee: number;
  grandTotal: number;
  status: BookingStatus;
  idempotencyKey: string;
  paymentMethod: string;
  createdAt: string;
  sagaSteps: SagaEventStep[];
}
