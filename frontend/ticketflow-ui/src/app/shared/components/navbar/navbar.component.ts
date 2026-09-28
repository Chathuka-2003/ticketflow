import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="navbar-wrapper">
      <div class="tf-container navbar-inner">
        <!-- Brand Logo -->
        <a routerLink="/" class="brand">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
              <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">Ticket<span class="text-gradient">Flow</span></span>
            <span class="brand-tag">CLOUD NATIVE LIVE</span>
          </div>
        </a>

        <!-- Center Navigation -->
        <nav class="nav-links">
          <a
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="nav-item"
          >
            <span class="nav-icon">✨</span>
            <span>Explore Events</span>
          </a>

          <a routerLink="/my-bookings" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🎟️</span>
            <span>My Bookings</span>
            @if (bookingService.userBookings().length > 0) {
              <span class="nav-count">{{ bookingService.userBookings().length }}</span>
            }
          </a>

          <a routerLink="/organizer" routerLinkActive="active" class="nav-item organizer-link">
            <span class="nav-icon">🎛️</span>
            <span>Organizer Studio</span>
            <span class="role-chip">ROLE</span>
          </a>
        </nav>

        <!-- Right Actions -->
        <div class="nav-actions">
          <!-- Active Redis Seat Hold Pill -->
          @if (bookingService.activeHold(); as hold) {
            <a [routerLink]="['/checkout', hold.eventId]" class="hold-pill" title="Active Redis Seat Lock">
              <span class="live-dot"></span>
              <span class="hold-label">
                {{ hold.seats.length }} {{ hold.seats.length === 1 ? 'Seat' : 'Seats' }} Held
              </span>
              <span class="hold-timer">{{ bookingService.formattedHoldTimer() }}</span>
            </a>
          }

          <!-- Authenticated User State -->
          @if (authService.isAuthenticated() && authService.currentUser(); as user) {
            <div class="user-menu">
              <div class="user-avatar">
                {{ user.fullName.charAt(0).toUpperCase() }}
              </div>
              <div class="user-meta">
                <span class="user-name">{{ user.fullName }}</span>
                <span class="user-role" [class.organizer]="authService.isOrganizer()">
                  {{ user.roles[0] }}
                </span>
              </div>
              <button class="btn btn-secondary btn-sm" (click)="authService.logout()">
                Sign Out
              </button>
            </div>
          } @else {
            <div class="guest-actions">
              <button
                class="btn btn-secondary btn-sm demo-btn"
                [disabled]="switchingRole()"
                (click)="instantLogin('ORGANIZER')"
                title="1-Click Organizer Login"
              >
                ⚡ Demo Organizer
              </button>
              <a routerLink="/login" class="btn btn-primary btn-sm">
                Sign In / Register
              </a>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar-wrapper {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(7, 8, 13, 0.82);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .navbar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 76px;
      gap: 1rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      transition: transform 0.25s ease;

      &:hover {
        transform: scale(1.02);
      }
    }

    .brand-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: var(--grad-primary);
      display: grid;
      place-items: center;
      color: #fff;
      box-shadow: 0 8px 20px -4px rgba(236, 72, 153, 0.55);

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .brand-tag {
      font-family: var(--font-mono);
      font-size: 0.62rem;
      letter-spacing: 0.14em;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      padding: 0.32rem;
      border-radius: var(--radius-pill);
    }

    .nav-item {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 1.05rem;
      border-radius: var(--radius-pill);
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-secondary);
      transition: all 0.22s ease;

      &:hover {
        color: var(--text-primary);
        background: rgba(255, 255, 255, 0.05);
      }

      &.active {
        color: #fff;
        background: rgba(139, 92, 246, 0.24);
        box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.45);
      }
    }

    .nav-count {
      background: var(--grad-primary);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.08rem 0.48rem;
      border-radius: var(--radius-pill);
    }

    .role-chip {
      font-family: var(--font-mono);
      font-size: 0.62rem;
      padding: 0.1rem 0.42rem;
      border-radius: 6px;
      background: rgba(6, 182, 212, 0.18);
      color: #67e8f9;
      border: 1px solid rgba(6, 182, 212, 0.35);
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .hold-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.42rem 0.85rem;
      border-radius: var(--radius-pill);
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.45);
      color: #fde68a;
      font-size: 0.8rem;
      font-weight: 600;
      animation: pulseGlow 2.4s infinite;
      transition: transform 0.2s ease;

      &:hover {
        transform: translateY(-2px);
      }
    }

    .hold-timer {
      font-family: var(--font-mono);
      font-weight: 700;
      color: #fff;
      background: rgba(245, 158, 11, 0.3);
      padding: 0.1rem 0.45rem;
      border-radius: 6px;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.3rem 0.4rem 0.3rem 0.65rem;
      border-radius: var(--radius-pill);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--grad-cyber);
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: 0.85rem;
      color: #fff;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    .user-name {
      font-size: 0.82rem;
      font-weight: 600;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-role {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: #94a3b8;

      &.organizer {
        color: #34d399;
      }
    }

    .guest-actions {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }

    @media (max-width: 960px) {
      .navbar-inner {
        flex-wrap: wrap;
        height: auto;
        padding-top: 0.85rem;
        padding-bottom: 0.85rem;
      }
      .nav-links {
        order: 3;
        width: 100%;
        justify-content: center;
        overflow-x: auto;
      }
      .demo-btn {
        display: none;
      }
    }
  `],
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  readonly bookingService = inject(BookingService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly switchingRole = signal(false);

  instantLogin(role: 'USER' | 'ORGANIZER'): void {
    this.switchingRole.set(true);
    this.authService.quickDemoLogin(role).subscribe({
      next: (profile) => {
        this.switchingRole.set(false);
        this.toast.success(
          `Signed in as ${profile.roles[0]}`,
          `Authenticated via OAuth2/JWKS (${profile.email})`
        );
        if (role === 'ORGANIZER') {
          this.router.navigate(['/organizer']);
        }
      },
      error: () => {
        this.switchingRole.set(false);
        this.router.navigate(['/login']);
      },
    });
  }
}
