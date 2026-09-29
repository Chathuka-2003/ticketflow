import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="tf-footer">
      <div class="tf-container">
        <!-- Architecture Telemetry Strip -->
        <div class="telemetry-bar glass-card">
          <div class="telemetry-title">
            <span class="live-dot"></span>
            <span>DISTRIBUTED MICROSERVICES TOPOLOGY</span>
          </div>
          <div class="telemetry-pills">
            <span class="t-pill">🌐 Nginx + Runtime Env</span>
            <span class="t-pill">🛡️ Spring Cloud Gateway :8080</span>
            <span class="t-pill">🔑 OAuth2 JWKS Auth :8081</span>
            <span class="t-pill">🎪 Event Service :8082</span>
            <span class="t-pill">⚡ Redis 7 Seat TTL Lock</span>
            <span class="t-pill">🐇 RabbitMQ 3 Saga Broker</span>
            <span class="t-pill">🐘 PostgreSQL 16 Flyway</span>
          </div>
        </div>

        <div class="footer-bottom">
          <div class="footer-brand">
            <strong>TicketFlow Platform</strong>
            <span>Cloud-Native Event Ticketing • Spring Boot 3 + Angular + Docker + AWS EKS</span>
          </div>
          <div class="footer-links">
            <a routerLink="/">Explore Events</a>
            <a routerLink="/my-bookings">My Bookings</a>
            <a routerLink="/organizer">Organizer Dashboard</a>
            <a routerLink="/login">Keycloak / OIDC Portal</a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .tf-footer {
      margin-top: 5rem;
      padding: 2rem 0 3rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(7, 8, 13, 0.65);
    }

    .telemetry-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 1.35rem;
      margin-bottom: 2rem;
      background: rgba(15, 23, 42, 0.65);
    }

    .telemetry-title {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-family: var(--font-mono);
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #cbd5e1;
    }

    .telemetry-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .t-pill {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      padding: 0.28rem 0.65rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
    }

    .footer-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .footer-brand {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;

      strong {
        color: var(--text-primary);
        font-family: var(--font-display);
      }
    }

    .footer-links {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;

      a {
        color: var(--text-secondary);
        transition: color 0.2s ease;

        &:hover {
          color: #fff;
        }
      }
    }
  `],
})
export class FooterComponent {}
