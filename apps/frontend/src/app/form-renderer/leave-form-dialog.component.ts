import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-leave-form-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Unsaved changes</h2>
    <mat-dialog-content>
      <p>Your changes haven't been saved yet. If you leave now, your latest edits may be lost.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton cdkFocusInitial [mat-dialog-close]="false">Stay</button>
      <button matButton [mat-dialog-close]="true">Leave anyway</button>
    </mat-dialog-actions>
  `,
})
export class LeaveFormDialogComponent {}
