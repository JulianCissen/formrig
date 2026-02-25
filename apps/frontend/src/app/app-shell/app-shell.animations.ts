/**
 * Route cross-fade animation trigger for AppShellComponent.
 * Trigger name: routeAnimations.
 * Applied to the .route-transition-host div wrapping RouterOutlet.
 * The trigger value must be a monotonically incrementing integer (not the URL) to fire on every navigation.
 */
import {
  trigger,
  transition,
  style,
  animate,
  query,
  group,
} from '@angular/animations';

export const routeFadeAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    // Outgoing page: starts visible
    query(':leave', [
      style({ opacity: 1 })
    ], { optional: true }),

    // Incoming page: starts invisible, positioned absolutely so it
    // does NOT push layout during the cross-fade overlap.
    // NOTE for AppShellComponent implementer: the .route-transition-host
    // container MUST have `position: relative` and a defined height/min-height
    // so the absolute-positioned entering page does not collapse the container.
    query(':enter', [
      style({ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%' })
    ], { optional: true }),

    group([
      // Outgoing: fade out over 180ms ease-in
      query(':leave', [
        animate('180ms cubic-bezier(0.4, 0, 1, 1)', style({ opacity: 0 }))
      ], { optional: true }),

      // Incoming: fade in over 220ms M3-decel, with 50ms delay
      query(':enter', [
        animate('220ms 50ms cubic-bezier(0, 0, 0, 1)', style({ opacity: 1 }))
      ], { optional: true }),
    ]),

    // After animation: restore incoming page to normal flow
    query(':enter', [
      style({ position: 'static', width: 'auto' })
    ], { optional: true }),
  ]),
]);
