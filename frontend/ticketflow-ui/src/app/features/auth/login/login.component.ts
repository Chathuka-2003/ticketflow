import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Role } from '../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tf-container auth-page">
      <div class="auth-grid">
        <!-- Left Info Showcase -->
        <div class="auth-showcase glass-card animate-fade-up">
          <span class="badge badge-category">🔑 OIDC / JWKS IDENTITY PROVIDER</span>
          <h1>Zero-Trust Microservice Authentication</h1>
          <p>
            TicketFlow issues RS256-signed JWT access tokens paired with rotating
            <code>HttpOnly</code> refresh cookies. Downstream microservices verify signatures
            automatically via <code>/.well-known/jwks.json</code>.
          </p>

          <!-- 1-Click Demo Logins -->
          <div class="quick-demo-box">
            <span class="section-lbl">⚡ 1-CLICK INSTANT DEMO ACCOUNTS</span>
            <p class="qd-sub">
              Automatically provisions the account in PostgreSQL <code>auth_db</code> if needed
              and attaches the RS256 Bearer token via the Angular HTTP Interceptor.
            </p>
            <div class="demo-btns">
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="loading()"
                (click)="quickDemo('USER')"
              >
                🎟️ Demo Attendee (ROLE_USER)
              </button>
              <button
                type="button"
                class="btn btn-cyber"
                [disabled]="loading()"
                (click)="quickDemo('ORGANIZER')"
              >
                🎛️ Demo Organizer (ROLE_ORGANIZER)
              </button>
            </div>
          </div>

          <div class="security-features">
            <div class="sf-item">
              <span class="sf-icon">🛡️</span>
              <div>
                <strong>Spring Cloud Gateway Token Relay</strong>
                <small>Validates JWT issuer & expiry before routing to services</small>
              </div>
            </div>
            <div class="sf-item">
              <span class="sf-icon">🔄</span>
              <div>
                <strong>Refresh Token Rotation</strong>
                <small>SHA-256 hashed refresh tokens in PostgreSQL with instant revocation</small>
              </div>
            </div>
            <div class="sf-item">
              <span class="sf-icon">🎭</span>
              <div>
                <strong>Role-Based Access Control (RBAC)</strong>
                <small>USER, ORGANIZER, and ADMIN roles enforced at method & route level</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Form Card -->
        <div class="auth-card glass-card animate-fade-up stagger-1">
          <div class="mode-tabs">
            <button
              type="button"
              class="mode-tab"
              [class.active]="mode() === 'LOGIN'"
              (click)="mode.set('LOGIN')"
            >
              Sign In
            </button>
            <button
              type="button"
              class="mode-tab"
              [class.active]="mode() === 'REGISTER'"
              (click)="mode.set('REGISTER')"
            >
              Create Account
            </button>
          </div>

          @if (mode() === 'LOGIN') {
            <form (ngSubmit)="submitLogin()" class="auth-form">
              <h2>Welcome Back</h2>
              <p class="sub">Sign in with your TicketFlow / OIDC credentials</p>

              <div class="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  class="tf-input"
                  [(ngModel)]="loginForm.email"
                  placeholder="attendee@ticketflow.io"
                  required
                />
              </div>

              <div class="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  class="tf-input"
                  [(ngModel)]="loginForm.password"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                class="btn btn-primary btn-lg full-btn"
                [disabled]="loading()"
              >
                {{ loading() ? 'Authenticating...' : 'Sign In & Acquire JWT →' }}
              </button>
            </form>
          } @else {
            <form (ngSubmit)="submitRegister()" class="auth-form">
              <h2>Create TicketFlow Account</h2>
              <p class="sub">Select your role to access attendee booking or organizer studio</p>

              <div class="form-group">
                <label>Full Name / Organization</label>
                <input
                  type="text"
                  name="fullName"
                  class="tf-input"
                  [(ngModel)]="registerForm.fullName"
                  placeholder="Alex Rivera"
                  required
                />
              </div>

              <div class="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="regEmail"
                  class="tf-input"
                  [(ngModel)]="registerForm.email"
                  placeholder="alex@example.com"
                  required
                />
              </div>

              <div class="form-group">
                <label>Password (min 8 characters)</label>
                <input
                  type="password"
                  name="regPassword"
                  class="tf-input"
                  [(ngModel)]="registerForm.password"
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              <div class="form-group">
                <label>Account Role (RBAC)</label>
                <div class="role-selector">
                  <button
                    type="button"
                    class="role-opt"
                    [class.selected]="registerForm.role === 'USER'"
                    (click)="registerForm.role = 'USER'"
                  >
                    <strong>🎟️ Attendee (USER)</strong>
                    <small>Book events & hold seats</small>
                  </button>
                  <button
                    type="button"
                    class="role-opt"
                    [class.selected]="registerForm.role === 'ORGANIZER'"
                    (click)="registerForm.role = 'ORGANIZER'"
                  >
                    <strong>🎛️ Organizer (ORGANIZER)</strong>
                    <small>Create & publish events</small>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                class="btn btn-primary btn-lg full-btn"
                [disabled]="loading()"
              >
                {{ loading() ? 'Creating Account...' : 'Register & Sign In →' }}
              </button>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      padding: 3rem 1.5rem;
    }

    .auth-grid {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 2.5rem;
      align-items: stretch;
    }

    .auth-showcase {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;

      h1 {
        font-family: var(--font-display);
        font-size: 2.25rem;
        line-height: 1.15;
        margin: 0.9rem 0 0.75rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.96rem;
        margin-bottom: 1.75rem;
      }
    }

    .quick-demo-box {
      padding: 1.35rem;
      border-radius: var(--radius-md);
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.35);
      margin-bottom: 1.75rem;

      .section-lbl {
        display: block;
        font-family: var(--font-mono);
        font-size: 0.74rem;
        font-weight: 700;
        color: #ddd6fe;
        margin-bottom: 0.35rem;
      }

      .qd-sub {
        font-size: 0.82rem;
        margin-bottom: 1rem;
      }

      .demo-btns {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
    }

    .security-features {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .sf-item {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;

      .sf-icon {
        font-size: 1.25rem;
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.05);
        display: grid;
        place-items: center;
      }

      div {
        display: flex;
        flex-direction: column;
      }

      strong {
        font-size: 0.9rem;
      }

      small {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }
    }

    .auth-card {
      padding: 2.25rem;
    }

    .mode-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      background: rgba(7, 8, 13, 0.6);
      padding: 0.35rem;
      border-radius: var(--radius-md);
      margin-bottom: 1.75rem;
    }

    .mode-tab {
      padding: 0.65rem;
      border-radius: 10px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;

      &.active {
        background: var(--grad-primary);
        color: #fff;
      }
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;

      h2 {
        font-family: var(--font-display);
        font-size: 1.55rem;
      }

      .sub {
        color: var(--text-secondary);
        font-size: 0.88rem;
        margin-top: -0.6rem;
        margin-bottom: 0.25rem;
      }
    }

    .role-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .role-opt {
      text-align: left;
      padding: 0.85rem;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.03);
      border: 1.5px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      transition: all 0.2s ease;

      strong {
        font-size: 0.85rem;
      }

      small {
        font-size: 0.74rem;
        color: var(--text-secondary);
      }

      &.selected {
        background: rgba(139, 92, 246, 0.16);
        border-color: var(--accent-primary);
      }
    }

    .full-btn {
      width: 100%;
      margin-top: 0.5rem;
    }

    @media (max-width: 960px) {
      .auth-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<'LOGIN' | 'REGISTER'>('LOGIN');
  readonly loading = signal<boolean>(false);

  private returnUrl = '/';

  loginForm = {
    email: 'attendee@ticketflow.io',
    password: 'Password123!',
  };

  registerForm: {
    fullName: string;
    email: string;
    password: string;
    role: Role;
  } = {
    fullName: '',
    email: '',
    password: '',
    role: 'USER',
  };

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
    const requestedRole = this.route.snapshot.queryParamMap.get('role');
    if (requestedRole === 'ORGANIZER') {
      this.loginForm.email = 'organizer@ticketflow.io';
      this.registerForm.role = 'ORGANIZER';
    }
  }

  submitLogin(): void {
    if (!this.loginForm.email || !this.loginForm.password) return;
    this.loading.set(true);
    this.authService.login(this.loginForm).subscribe({
      next: (profile) => {
        this.loading.set(false);
        this.toast.success('Authenticated!', `Welcome back, ${profile.fullName}`);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(
          'Login Failed',
          err?.error?.detail || 'Invalid email or password. Try the 1-Click Demo buttons!'
        );
      },
    });
  }

  submitRegister(): void {
    if (
      !this.registerForm.fullName.trim() ||
      !this.registerForm.email.trim() ||
      this.registerForm.password.length < 8
    ) {
      this.toast.warning(
        'Validation Error',
        'Please enter your name, valid email, and a password of at least 8 characters.'
      );
      return;
    }

    this.loading.set(true);
    this.authService.register(this.registerForm).subscribe({
      next: (created) => {
        this.authService
          .login(
            {
              email: this.registerForm.email,
              password: this.registerForm.password,
            },
            created.fullName
          )
          .subscribe({
            next: (profile) => {
              this.loading.set(false);
              this.toast.success(
                'Account Created & Signed In!',
                `Registered as ${profile.roles[0]}`
              );
              if (profile.roles.includes('ORGANIZER')) {
                this.router.navigate(['/organizer']);
              } else {
                this.router.navigateByUrl(this.returnUrl);
              }
            },
            error: () => {
              this.loading.set(false);
              this.mode.set('LOGIN');
            },
          });
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(
          'Registration Failed',
          err?.error?.detail || 'Email may already be registered.'
        );
      },
    });
  }

  quickDemo(role: 'USER' | 'ORGANIZER'): void {
    this.loading.set(true);
    this.authService.quickDemoLogin(role).subscribe({
      next: (profile) => {
        this.loading.set(false);
        this.toast.success(
          `Signed in as ${profile.roles[0]}`,
          `Authenticated via OAuth2/JWKS (${profile.email})`
        );
        if (role === 'ORGANIZER' && this.returnUrl === '/') {
          this.router.navigate(['/organizer']);
        } else {
          this.router.navigateByUrl(this.returnUrl);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(
          'Auth Service Unreachable',
          err?.error?.detail || 'Ensure auth-service and api-gateway are running.'
        );
      },
    });
  }
}
