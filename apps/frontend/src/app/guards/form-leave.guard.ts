import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { map } from 'rxjs';
import { FormRendererPage } from '../pages/form-renderer/form-renderer.page';
import { LeaveFormDialogComponent } from '../form-renderer/leave-form-dialog.component';

export const formLeaveGuard: CanDeactivateFn<FormRendererPage> = (component) => {
  if (!component.isDirty()) {
    return true;
  }

  return inject(MatDialog)
    .open(LeaveFormDialogComponent, { width: '360px' })
    .afterClosed()
    .pipe(map(result => result === true));
};
