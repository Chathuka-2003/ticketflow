export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

export interface VenueResponse {
  id: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
}

export interface VenueRequest {
  name: string;
  city: string;
  address: string;
  capacity: number;
}

export interface TicketTypeResponse {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface TicketTypeRequest {
  name: string;
  price: number;
  quantity: number;
}

export interface EventSummary {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  venueName: string;
  city: string;
}

export interface EventDetail {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  category: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  venue: VenueResponse;
  ticketTypes: TicketTypeResponse[];
}

export interface EventRequest {
  title: string;
  description: string;
  category: string;
  venueId: string;
  startsAt: string;
  endsAt: string;
  ticketTypes: TicketTypeRequest[];
}

export interface EventUpdateRequest {
  title: string;
  description: string;
  category: string;
  venueId: string;
  startsAt: string;
  endsAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
