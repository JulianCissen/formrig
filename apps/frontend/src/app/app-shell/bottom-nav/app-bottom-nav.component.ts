import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * AppBottomNavComponent — Fixed bottom navigation bar for mobile viewports (< 600 px).
 * Hidden on tablet and desktop via CSS media query.
 * Provides the same 3 navigation destinations as the desktop nav rail.
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './app-bottom-nav.component.html',
  styleUrl: './app-bottom-nav.component.scss',
})
export class AppBottomNavComponent {}
