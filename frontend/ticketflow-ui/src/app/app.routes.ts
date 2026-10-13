import { Routes } from '@angular/router';
import { EventListComponent } from './features/events/event-list/event-list.component';
import { SeatSelectionComponent } from './features/events/seat-selection/seat-selection.component';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { MyBookingsComponent } from './features/bookings/my-bookings/my-bookings.component';
import { OrganizerDashboardComponent } from './features/organizer/organizer-dashboard/organizer-dashboard.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard, organizerGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: EventListComponent,
    title: 'TicketFlow — Explore Live Events & Concerts',
  },
  {
    path: 'events/:id',
    component: SeatSelectionComponent,
    title: 'TicketFlow — Interactive Arena Seat Selection',
  },
  {
    path: 'checkout/:id',
    component: CheckoutComponent,
    canActivate: [authGuard],
    title: 'TicketFlow — Checkout & Saga Choreography',
  },
  {
    path: 'my-bookings',
    component: MyBookingsComponent,
    title: 'TicketFlow — My Digital Passes & Bookings',
  },
  {
    path: 'organizer',
    component: OrganizerDashboardComponent,
    canActivate: [organizerGuard],
    title: 'TicketFlow — Organizer Studio (RBAC Protected)',
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'TicketFlow — OIDC / JWKS Sign In',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
