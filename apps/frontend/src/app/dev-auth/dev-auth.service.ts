import { Injectable, Signal, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DevAuthService {
  private readonly storageKey = '__formrig_dev__selected_user_id';

  private readonly _currentUserId = signal<string | null>(
    localStorage.getItem(this.storageKey)
  );

  readonly currentUserId: Signal<string | null> = this._currentUserId.asReadonly();

  login(id: string): void {
    localStorage.setItem(this.storageKey, id);
    this._currentUserId.set(id);
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this._currentUserId.set(null);
  }
}
