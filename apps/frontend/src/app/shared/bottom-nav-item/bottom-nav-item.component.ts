import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';

@Component({
  selector: 'app-bottom-nav-item',
  standalone: true,
  imports: [RouterModule, MatIconModule, MatRipple],
  templateUrl: './bottom-nav-item.component.html',
  styleUrl: './bottom-nav-item.component.scss',
  host: { class: 'app-bottom-nav-item' },
})
export class BottomNavItemComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly route = input.required<string>();
  readonly exact = input<boolean>(false);
}
