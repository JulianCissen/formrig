import { Component, inject }      from '@angular/core';
import { Router }                  from '@angular/router';
import { MatIconModule }           from '@angular/material/icon';
import { MatMenuModule }           from '@angular/material/menu';
import { MatDividerModule }        from '@angular/material/divider';
import { MatRippleModule }         from '@angular/material/core';
import { MOCK_USERS }              from '@formrig/dev-fixtures';
import { DevAuthService }          from './dev-auth.service';

@Component({
  selector: 'app-dev-user-switcher',
  standalone: true,
  imports: [MatIconModule, MatMenuModule, MatDividerModule, MatRippleModule],
  templateUrl: './dev-user-switcher.component.html',
  styleUrl: './dev-user-switcher.component.scss',
})
export class DevUserSwitcherComponent {
  protected readonly MOCK_USERS = MOCK_USERS;
  protected readonly currentUserId;
  private readonly authService = inject(DevAuthService);
  private readonly router = inject(Router);

  constructor() {
    this.currentUserId = this.authService.currentUserId;
  }

  selectUser(id: string): void {
    this.authService.login(id);
  }

  signOut(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
