import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(type: ToastMessage['type'], title: string, message: string, durationMs = 4500): void {
    const id = Math.random().toString(36).substring(2, 10);
    this.toasts.update((list) => [...list, { id, type, title, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(title: string, message: string): void {
    this.show('success', title, message);
  }

  error(title: string, message: string): void {
    this.show('error', title, message, 6000);
  }

  info(title: string, message: string): void {
    this.show('info', title, message);
  }

  warning(title: string, message: string): void {
    this.show('warning', title, message, 5500);
  }

  dismiss(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
