import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, inject, signal, WritableSignal, computed, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { A11yModule, LiveAnnouncer } from '@angular/cdk/a11y';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { ReactiveFormsModule, FormGroup, FormControl, AbstractControl, Validators } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse }                                       from '@angular/common/http';
import { Subject, Subscription, EMPTY, Observable }              from 'rxjs';
import { debounceTime, map, switchMap, tap, catchError, concatMap } from 'rxjs/operators';
import { Router }                                                  from '@angular/router';
import { FormApiService }                                          from '../services/form-api.service';
import { AUTOSAVE_DELAY_MS }                                        from '../tokens/autosave.token';
import { FieldDto, FormDefinitionDto, FormDefinitionDtoSchema, StepDto } from '../models/field.model';

interface FileUploadEntry {
  clientId: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  filename?: string;      // server-returned filename
  fileId?: string;        // server-returned file record id
  url?: string;           // server-returned download URL
  errorMessage?: string;
}

@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [A11yModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatButtonModule, MatRadioModule, MatCheckboxModule, MatSelectModule, MatAutocompleteModule, MatIconModule, MatProgressBarModule, MatSnackBarModule, MatStepperModule, ReactiveFormsModule],
  templateUrl: './form-renderer.component.html',
  styleUrl: './form-renderer.component.scss',
  host: { style: 'display:block; padding:2rem; width:100%' }
})
export class FormRendererComponent implements OnInit, OnDestroy {
  private readonly api            = inject(FormApiService);
  private readonly router         = inject(Router);
  private readonly liveAnnouncer  = inject(LiveAnnouncer);
  private readonly autosaveDelay  = inject(AUTOSAVE_DELAY_MS);
  private readonly bp             = inject(BreakpointObserver);
  private readonly snackBar       = inject(MatSnackBar);

  private isWide = toSignal(
    this.bp.observe('(min-width: 960px)')
  );

  readonly orientation = computed<'horizontal' | 'vertical'>(() =>
    this.isWide()?.matches ? 'horizontal' : 'vertical'
  );

  stepGroups: FormGroup[] = [];

  @ViewChild('stepper') stepper!: MatStepper;
  @ViewChildren('stepContent') stepContents!: QueryList<ElementRef<HTMLElement>>;

  @Output() readonly titleLoaded = new EventEmitter<string>();

  formDef = signal<FormDefinitionDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  dragOverFieldId: WritableSignal<string | null> = signal<string | null>(null);
  uploadEntries = signal<Map<string, FileUploadEntry[]>>(new Map());
  private uploadQueue$ = new Subject<{ fieldId: string; entry: FileUploadEntry }>();
  private uploadQueueSub?: Subscription;

  @Input() formId = '';

  private readonly autosave$ = new Subject<{ fieldId: string; value: unknown }>();
  private autosaveSub?: Subscription;
  autosaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  flatGroup: FormGroup | null = null;

  onDragOver(event: DragEvent, fieldId: string): void {
    event.preventDefault();
    this.dragOverFieldId.set(fieldId);
  }

  onDragLeave(event: DragEvent, fieldId: string): void {
    // Guard against child element flickering
    if (event.relatedTarget && (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      return;
    }
    if (this.dragOverFieldId() === fieldId) {
      this.dragOverFieldId.set(null);
    }
  }

  onDrop(event: DragEvent, fieldId: string): void {
    event.preventDefault();
    this.dragOverFieldId.set(null);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.enqueueFiles(fieldId, files);
    }
  }

  onFileChange(event: Event, fieldId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.enqueueFiles(fieldId, input.files);
      input.value = '';
    }
  }

  enqueueFiles(fieldId: string, files: FileList | File[]): void {
    const fileArray = Array.from(files);
    const newEntries: FileUploadEntry[] = fileArray.map(file => ({
      clientId: crypto.randomUUID(),
      file,
      status: 'pending',
    }));
    const current = this.uploadEntries();
    const updated = new Map(current);
    const existing = updated.get(fieldId) ?? [];
    updated.set(fieldId, [...existing, ...newEntries]);
    this.uploadEntries.set(updated);
    for (const entry of newEntries) {
      this.uploadQueue$.next({ fieldId, entry });
    }
  }

  private updateEntry(
    fieldId: string,
    clientId: string,
    patch: Partial<FileUploadEntry>,
  ): void {
    const current = this.uploadEntries();
    const updated = new Map(current);
    const list = updated.get(fieldId);
    if (!list) return;
    updated.set(fieldId, list.map(e =>
      e.clientId === clientId ? { ...e, ...patch } : e
    ));
    this.uploadEntries.set(updated);
  }

  private processUpload(fieldId: string, entry: FileUploadEntry): Observable<void> {
    this.updateEntry(fieldId, entry.clientId, { status: 'uploading' });
    return this.api.uploadFile(this.formId, fieldId, entry.file).pipe(
      tap(response => {
        this.updateEntry(fieldId, entry.clientId, {
          status: 'done',
          filename: response.filename,
          fileId: response.id,
          url: response.url,
        });
        void this.liveAnnouncer.announce(response.filename + ' uploaded', 'polite');
      }),
      catchError((err: HttpErrorResponse) => {
        const msg = err?.status === 422 ? 'File rejected by the server.' : 'Upload failed.';
        this.updateEntry(fieldId, entry.clientId, { status: 'error', errorMessage: msg });
        void this.liveAnnouncer.announce('Upload failed: ' + entry.file.name, 'assertive');
        return EMPTY;
      }),
      map(() => void 0),
    );
  }

  openFile(entry: FileUploadEntry): void {
    window.open(entry.url!, '_blank');
  }

  dismissError(fieldId: string, clientId: string): void {
    const current = this.uploadEntries();
    const updated = new Map(current);
    const list = updated.get(fieldId);
    if (list) {
      updated.set(fieldId, list.filter(e => e.clientId !== clientId));
    }
    this.uploadEntries.set(updated);
  }

  deleteUploadedFile(fieldId: string, entry: FileUploadEntry): void {
    if (!entry.fileId) return;
    this.api.deleteFile(this.formId, entry.fileId).subscribe({
      next: () => {
        const current = this.uploadEntries();
        const updated = new Map(current);
        const list = updated.get(fieldId);
        if (list) {
          updated.set(fieldId, list.filter(e => e.clientId !== entry.clientId));
        }
        this.uploadEntries.set(updated);
      },
      error: () => {
        this.snackBar.open('Could not delete file. Try again.', 'Dismiss', { duration: 4000 });
      },
    });
  }

  ngOnInit(): void {
    this.api.getForm(this.formId).subscribe({
      next: (raw) => {
        // Validate with existing FormDefinitionDtoSchema (re-use)
        const asDefinition = {
          id:     raw['id'] as string,
          title:  raw['title'] as string | undefined,
          fields: raw['fields'] as unknown[],
          steps:  raw['steps'] as unknown[] | undefined,
        };
        const result = FormDefinitionDtoSchema.safeParse(asDefinition);
        if (!result.success) {
          this.error.set('Unexpected response from server.');
          this.loading.set(false);
          return;
        }
        this.formDef.set(result.data);
        if ((result.data.steps?.length ?? 0) > 0) {
          this.stepGroups = this.buildStepGroups(result.data.steps!);
          this.setupStepperAutosave();
        } else {
          this.flatGroup = this.buildFlatGroup(result.data.fields ?? []);
          this.setupFlatAutosave();
        }
        this.titleLoaded.emit(result.data.title ?? 'Form');
        this.loading.set(false);
        void this.liveAnnouncer.announce(
          result.data.title ? 'Form loaded: ' + result.data.title : 'Form loaded.',
          'polite',
        );
      },
      error: (err) => {
        if (err?.status === 404) {
          this.router.navigate(['/']);
        } else {
          this.error.set('Could not load the form. Please try again later.');
        }
        this.loading.set(false);
      },
    });

    // Upload queue — serial processing via concatMap
    this.uploadQueueSub = this.uploadQueue$.pipe(
      concatMap(({ fieldId, entry }) => this.processUpload(fieldId, entry)),
    ).subscribe();

    // Autosave pipeline
    this.autosaveSub = this.autosave$.pipe(
      debounceTime(this.autosaveDelay),
      tap(() => this.autosaveStatus.set('saving')),
      switchMap(({ fieldId, value }) =>
        this.api.patchFormField(this.formId, fieldId, value).pipe(
          tap(() => {
            this.autosaveStatus.set('saved');
            setTimeout(() => { if (this.autosaveStatus() === 'saved') this.autosaveStatus.set('idle'); }, 2000);
          }),
          catchError(() => {
            this.autosaveStatus.set('error');
            return EMPTY;
          }),
        ),
      ),
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.autosaveSub?.unsubscribe();
    this.uploadQueueSub?.unsubscribe();
  }

  private setupStepperAutosave(): void {
    for (const group of this.stepGroups) {
      for (const [fieldId, control] of Object.entries(group.controls)) {
        this.autosaveSub!.add(control.valueChanges.subscribe((value) => {
          this.autosave$.next({ fieldId, value });
        }));
      }
    }
  }

  private setupFlatAutosave(): void {
    if (!this.flatGroup) return;
    for (const [fieldId, control] of Object.entries(this.flatGroup.controls)) {
      this.autosaveSub!.add(control.valueChanges.subscribe((value) => {
        this.autosave$.next({ fieldId, value });
      }));
    }
  }

  private buildFlatGroup(fields: FieldDto[]): FormGroup {
    const controls: Record<string, AbstractControl> = {};
    for (const field of fields) {
      if (field.type === 'file-upload') continue;
      controls[field.id] = this.buildControl(field);
    }
    return new FormGroup(controls);
  }

  private buildStepGroups(steps: StepDto[]): FormGroup[] {
    return steps.map(step => {
      const controls: Record<string, AbstractControl> = {};
      for (const field of step.fields) {
        if (field.type === 'file-upload') {
          continue; // managed via uploadEntries signal — excluded from reactive form
        }
        controls[field.id] = this.buildControl(field);
      }
      return new FormGroup(controls);
    });
  }

  private buildControl(field: StepDto['fields'][number]): FormControl {
    const validators = field.required ? Validators.required : [];
    switch (field.type) {
      case 'checkbox':
        return new FormControl(
          { value: (field.value as boolean | undefined) ?? false, disabled: field.disabled },
          field.required ? Validators.requiredTrue : []
        );
      case 'select': {
        const raw = (field as { value?: string | string[] }).value;
        const initial = (field as { multiple?: boolean }).multiple
          ? (Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : [])
          : (raw ?? '');
        return new FormControl({ value: initial, disabled: field.disabled }, validators);
      }
      default:
        return new FormControl(
          { value: (field as { value?: string }).value ?? '', disabled: field.disabled },
          validators
        );
    }
  }

  onStepChange(event: StepperSelectionEvent): void {
    // Mark the leaving step's group as touched so hasError can activate
    const leaving = this.stepGroups[event.previouslySelectedIndex];
    if (leaving) {
      leaving.markAllAsTouched();
    }
    // Announce the new step to screen-reader users
    // Safe: onStepChange only fires when the stepper branch is rendered,
    // guaranteeing formDef() is non-null and steps is non-empty.
    const steps = this.formDef()!.steps!;
    void this.liveAnnouncer.announce(
      `Step ${event.selectedIndex + 1} of ${steps.length}: ${steps[event.selectedIndex].label}`,
      'polite'
    );
  }

  onStepAnimationDone(): void {
    const idx = this.stepper?.selectedIndex;
    if (idx == null) return;
    const panel = this.stepContents?.get(idx)?.nativeElement;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    first?.focus();
  }

  markStepTouched(stepIndex: number): void {
    this.stepGroups[stepIndex]?.markAllAsTouched();
  }
}
