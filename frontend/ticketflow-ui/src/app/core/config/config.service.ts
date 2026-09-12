import { Injectable } from '@angular/core';

declare global {
  interface Window {
    __env?: {
      API_URL?: string;
      KEYCLOAK_ISSUER?: string;
      SEAT_HOLD_TTL_SECONDS?: number;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  readonly apiUrl: string;
  readonly seatHoldTtlSeconds: number;

  constructor() {
    const env = typeof window !== 'undefined' ? window.__env : undefined;
    const rawUrl = env?.API_URL && !env.API_URL.includes('${') ? env.API_URL : '/api';
    this.apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    this.seatHoldTtlSeconds = env?.SEAT_HOLD_TTL_SECONDS || 600;
  }
}
