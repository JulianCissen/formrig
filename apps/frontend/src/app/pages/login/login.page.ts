import { Component, inject }         from '@angular/core';
import { Router, ActivatedRoute }    from '@angular/router';
import { MatCardModule }             from '@angular/material/card';
import { MatIconModule }             from '@angular/material/icon';
import { MatDividerModule }          from '@angular/material/divider';
import { MatRippleModule }           from '@angular/material/core';
import { MOCK_USERS }                from '@formrig/dev-fixtures';
import { DevAuthService }            from '../../dev-auth/dev-auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatDividerModule, MatRippleModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  protected readonly MOCK_USERS = MOCK_USERS;
  private readonly authService = inject(DevAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  selectUser(id: string): void {
    this.authService.login(id);
    const raw = this.route.snapshot.queryParams['returnUrl'];
    const returnUrl = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')
      ? raw
      : '/';
    this.router.navigateByUrl(returnUrl);
  }
}
