import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { ConfigService } from '../config/config.service';
import {
  AuthResponse,
  CurrentUserProfile,
  LoginRequest,
  RegisterRequest,
  Role,
  UserResponse,
} from '../models/auth.models';
import { ToastService } from './toast.service';

const STORAGE_KEY = 'ticketflow_auth_session';
const NAMES_MAP_KEY = 'ticketflow_user_names';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly currentUser = signal<CurrentUserProfile | null>(this.loadStoredSession());
  readonly isAuthenticated = computed(() => {
    const u = this.currentUser();
    return !!u && u.expiresAt > Date.now();
  });
  readonly isOrganizer = computed(() => {
    const u = this.currentUser();
    return !!u && (u.roles.includes('ORGANIZER') || u.roles.includes('ADMIN'));
  });
  readonly isAdmin = computed(() => {
    const u = this.currentUser();
    return !!u && u.roles.includes('ADMIN');
  });

  register(req: RegisterRequest): Observable<UserResponse> {
    return this.http
      .post<UserResponse>(`${this.config.apiUrl}/auth/register`, req)
      .pipe(
        tap((res) => {
          this.saveDisplayName(res.email, res.fullName);
        })
      );
  }

  login(req: LoginRequest, fullNameHint?: string): Observable<CurrentUserProfile> {
    return this.http
      .post<AuthResponse>(`${this.config.apiUrl}/auth/login`, req, {
        withCredentials: true,
      })
      .pipe(
        map((res) => this.applyAuthResponse(res, fullNameHint))
      );
  }

  refreshToken(): Observable<CurrentUserProfile> {
    return this.http
      .post<AuthResponse>(
        `${this.config.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .pipe(
        map((res) => this.applyAuthResponse(res)),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
        })
      );
  }

  logout(): void {
    this.http
      .post(`${this.config.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.clearSession();
        this.toast.info('Signed out', 'Your session & refresh token have been revoked.');
        this.router.navigate(['/']);
      });
  }

  quickDemoLogin(role: 'USER' | 'ORGANIZER'): Observable<CurrentUserProfile> {
    const credentials =
      role === 'ORGANIZER'
        ? {
            email: 'organizer@ticketflow.io',
            password: 'Password123!',
            fullName: 'Nova Live Productions (Organizer)',
            role: 'ORGANIZER' as Role,
          }
        : {
            email: 'attendee@ticketflow.io',
            password: 'Password123!',
            fullName: 'Alex Rivera (VIP Fan)',
            role: 'USER' as Role,
          };

    return this.login(
      { email: credentials.email, password: credentials.password },
      credentials.fullName
    ).pipe(
      catchError(() =>
        this.register(credentials).pipe(
          switchMap(() =>
            this.login(
              { email: credentials.email, password: credentials.password },
              credentials.fullName
            )
          )
        )
      )
    );
  }

  getAccessToken(): string | null {
    const u = this.currentUser();
    if (!u) return null;
    return u.accessToken;
  }

  private applyAuthResponse(res: AuthResponse, fullNameHint?: string): CurrentUserProfile {
    const claims = this.decodeJwt(res.accessToken);
    const email = (claims['email'] as string) || 'user@ticketflow.io';
    if (fullNameHint) {
      this.saveDisplayName(email, fullNameHint);
    }
    const storedName = this.getDisplayName(email);
    const roles = (claims['roles'] as Role[]) || ['USER'];
    const expiresAt = claims['exp']
      ? Number(claims['exp']) * 1000
      : Date.now() + res.expiresIn * 1000;

    const profile: CurrentUserProfile = {
      id: (claims['sub'] as string) || '',
      email,
      fullName: storedName || email.split('@')[0],
      roles,
      accessToken: res.accessToken,
      expiresAt,
    };

    this.currentUser.set(profile);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
    return profile;
  }

  clearSession(): void {
    this.currentUser.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private loadStoredSession(): CurrentUserProfile | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CurrentUserProfile;
      if (parsed.expiresAt <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveDisplayName(email: string, fullName: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const mapRaw = localStorage.getItem(NAMES_MAP_KEY);
      const mapObj = mapRaw ? JSON.parse(mapRaw) : {};
      mapObj[email.toLowerCase()] = fullName;
      localStorage.setItem(NAMES_MAP_KEY, JSON.stringify(mapObj));
    } catch {
      // ignore
    }
  }

  private getDisplayName(email: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const mapRaw = localStorage.getItem(NAMES_MAP_KEY);
      if (!mapRaw) return null;
      const mapObj = JSON.parse(mapRaw);
      return mapObj[email.toLowerCase()] || null;
    } catch {
      return null;
    }
  }

  private decodeJwt(token: string): Record<string, unknown> {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return {};
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return {};
    }
  }
}
