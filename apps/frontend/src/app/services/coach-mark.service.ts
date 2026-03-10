import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CoachMarkService {
  private static readonly PREFIX = 'formrig.coachMark.';
  private static readonly SUFFIX = '.shown';

  shouldShow(key: string): boolean {
    return localStorage.getItem(CoachMarkService.PREFIX + key + CoachMarkService.SUFFIX) === null;
  }

  markShown(key: string): void {
    localStorage.setItem(CoachMarkService.PREFIX + key + CoachMarkService.SUFFIX, 'true');
  }
}
