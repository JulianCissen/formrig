import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';

@Component({
  selector: 'app-nav-rail-item',
  standalone: true,
  imports: [RouterModule, MatIconModule, MatRipple],
  templateUrl: './nav-rail-item.component.html',
  styleUrl: './nav-rail-item.component.scss',
  host: { class: 'app-nav-rail-item' },
})
export class NavRailItemComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly route = input.required<string>();
  readonly exact = input<boolean>(false);
}
