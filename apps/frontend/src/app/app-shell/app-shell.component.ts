import { Component, inject, DestroyRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, scan, map } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppBottomNavComponent } from './bottom-nav/app-bottom-nav.component';
import { routeFadeAnimation } from './app-shell.animations';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    AppBottomNavComponent,
  ],
  animations: [routeFadeAnimation],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  /** True when viewport width < 600px. Used to hide/show nav rail. */
  readonly isMobile = toSignal(
    this.breakpointObserver
      .observe([Breakpoints.XSmall])
      .pipe(map(state => state.matches)),
    { initialValue: false }
  );

  /**
   * Monotonically incrementing counter bound to [@routeAnimations].
   * Using a counter (not URL) ensures animation fires on every NavigationEnd,
   * including same-path navigations with different query params.
   */
  readonly routeAnimationId = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      scan((n: number) => n + 1, 0)
    ),
    { initialValue: 0 }
  );

  constructor() {
    // Move keyboard focus to the page <h1> after each navigation.
    // tabindex="-1" is set on the <h1> inside PageWrapperComponent.
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        const h1 = document.querySelector<HTMLElement>('h1[tabindex="-1"]');
        h1?.focus();
      });
  }

  /** Navigation items shared by rail and referenced by bottom nav */
  readonly navItems = [
    { icon: 'dashboard', label: 'Forms', route: '/', exact: true },
    { icon: 'add_circle', label: 'New', route: '/form/new', exact: false },
    { icon: 'preview', label: 'Preview', route: '/form/active', exact: false },
  ] as const;
}
