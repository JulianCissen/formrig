import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * PageWrapperComponent — Universal page chrome for FormRig.
 *
 * Wraps every page's content with a consistent header area (title, optional
 * back-link, optional subtitle, optional action buttons) and enforces the
 * application-wide content max-width (1440 px) and horizontal centering.
 *
 * ## Content slots
 *
 * | Selector      | Purpose                                            | Required |
 * |---------------|----------------------------------------------------|----------|
 * | `[pageBack]`  | Back link or breadcrumb, rendered above the title  | No       |
 * | `[pageActions]` | Primary action buttons, right-aligned in title row | No       |
 * | `[pageSubtitle]` | Subtitle / description below title row             | No       |
 * | *(default)*   | Page body content                                  | Yes      |
 *
 * ## Usage
 * ```html
 * <app-page-wrapper title="Forms">
 *   <a pageBack mat-button routerLink="/">← Back</a>
 *   <p pageSubtitle>Manage your forms here.</p>
 *   <button pageActions mat-flat-button>New Form</button>
 *   <!-- page body goes here as default content -->
 * </app-page-wrapper>
 * ```
 */
@Component({
  selector: 'app-page-wrapper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-wrapper.component.html',
  styleUrl: './page-wrapper.component.scss',
})
export class PageWrapperComponent {
  /**
   * Page title rendered as an `<h1>` in the page header.
   * Receives programmatic focus after route navigation.
   * @required
   */
  readonly title = input.required<string>();
}
