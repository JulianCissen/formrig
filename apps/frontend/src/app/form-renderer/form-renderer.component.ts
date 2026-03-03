import { Component, OnInit, OnDestroy, HostListener, Input, Output, EventEmitter, inject, signal, WritableSignal, computed, ViewChild, ViewChildren, QueryList, ElementRef, effect, untracked } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { ReactiveFormsModule, FormGroup, FormControl, AbstractControl } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse }                                       from '@angular/common/http';
import { Subject, Subscription, EMPTY, Observable }              from 'rxjs';
import { debounceTime, map, startWith, switchMap, tap, catchError, concatMap } from 'rxjs/operators';
import { Router }                                                  from '@angular/router';
import { FormApiService }                                          from '../services/form-api.service';
import { AUTOSAVE_DELAY_MS }                                        from '../tokens/autosave.token';
import { FieldDto, FormDefinitionDto, FormDefinitionDtoSchema, StepDto, evaluateConditionTree, getEffectiveRules } from '@formrig/shared';
import { FileUploadEntry } from './file-upload-entry.model';
import { FormFieldComponent } from './form-field/form-field.component';

@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [A11yModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatButtonModule, MatRadioModule, MatCheckboxModule, MatSelectModule, MatAutocompleteModule, MatIconModule, MatProgressBarModule, MatSnackBarModule, MatStepperModule, MatTooltipModule, ReactiveFormsModule, FormFieldComponent],
  templateUrl: './form-renderer.component.html',
  styleUrl: './form-renderer.component.scss',
  host: { style: 'display:block; padding:2rem; width:100%' },
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('150ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('150ms ease-out', style({ opacity: 0 })),
      ]),
    ]),
  ],
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
  readonly isDirty = signal(false);
  pendingSave: { fieldId: string; value: unknown } | null = null;
  flatGroup: FormGroup | null = null;

  // ── Validation & conditional-rendering signals ────────────────────────────

  /** Current form values keyed by field UUID. Updated reactively from flatGroup or stepGroups. */
  readonly currentValues = signal<Record<string, unknown>>({});

  /** Set of field IDs that should be visible based on their visibleWhen condition. */
  readonly visibleFieldIds = computed<Set<string>>(() => {
    const formDef = this.formDef();
    const visible = new Set<string>();
    if (!formDef) return visible;
    const values = this.currentValues();
    // Collect all fields from flat list and from all steps
    const allFields: FieldDto[] = [
      ...(formDef.fields ?? []),
      ...(formDef.steps?.flatMap(s => s.fields) ?? []),
    ];
    for (const field of allFields) {
      if (field.type === 'file-upload') {
        // file-upload fields have no visibleWhen — always visible
        visible.add(field.id);
        continue;
      }
      if (!field.visibleWhen) {
        visible.add(field.id);
      } else if (evaluateConditionTree(field.visibleWhen, values)) {
        visible.add(field.id);
      }
    }
    return visible;
  });

  /** Tracks which field IDs have been blurred (dirtied) by the user. */
  readonly dirtyFieldIds = signal(new Set<string>());

  /** Map of field ID → violation messages. Only evaluates visible, non-file-upload flat fields. */
  readonly validationState = computed<Map<string, string[]>>(() => {
    const map = new Map<string, string[]>();
    // formDef.fields is the canonical flat list of ALL fields (including step fields).
    // The steps.flatMap branch below is a defensive fallback for stepped-only forms
    // where formDef.fields may be empty. Both lists are unioned so the Set/Map operations
    // are idempotent (same field.id processed twice is harmless).
    const fields = [
      ...(this.formDef()?.fields ?? []),
      ...(this.formDef()?.steps?.flatMap((s) => s.fields) ?? []),
    ];
    const values = this.currentValues();
    const visibleIds = this.visibleFieldIds();
    for (const field of fields) {
      if (!visibleIds.has(field.id)) continue;
      if (field.type === 'file-upload') continue;
      const rules = getEffectiveRules(field, values);
      const violations: string[] = [];
      for (const rule of rules) {
        if (!rule.matches(values[field.id] ?? null, values)) {
          violations.push(rule.errorMessage());
        }
      }
      map.set(field.id, violations);
    }
    return map;
  });

  /** True when any visible field has violations. */
  readonly submitDisabled = computed<boolean>(() => {
    for (const violations of this.validationState().values()) {
      if (violations.length > 0) return true;
    }
    return false;
  });

  /** All violation messages for visible fields, prefixed with the field label. */
  readonly submitErrors = computed<string[]>(() => {
    const errors: string[] = [];
    const fields = this.formDef()?.fields ?? [];
    const visibleIds = this.visibleFieldIds();
    const vs = this.validationState();
    for (const field of fields) {
      if (!visibleIds.has(field.id)) continue;
      const violations = vs.get(field.id) ?? [];
      for (const msg of violations) {
        errors.push(field.label + ': ' + msg);
      }
    }
    return errors;
  });

  /** Tooltip text for the submit button when it is disabled. */
  readonly submitTooltip = computed<string>(() => {
    const errors = this.submitErrors();
    if (errors.length === 0) return '';
    const visible = errors.slice(0, 5);
    const extra = errors.length - visible.length;
    return visible.join('\n') + (extra > 0 ? `\n\u2026and ${extra} more` : '');
  });

  private readonly _errorSyncEffect = effect(() => {
    const vs = this.validationState();
    const dirty = this.dirtyFieldIds();
    untracked(() => {
      const controls = this.collectAllControls();
      for (const [fieldId, control] of controls) {
        if (dirty.has(fieldId) && (vs.get(fieldId)?.length ?? 0) > 0) {
          control.setErrors({ custom: true });
          control.markAsTouched();
        } else {
          control.setErrors(null);
        }
      }
    });
  });

  private collectAllControls(): Map<string, AbstractControl> {
    const map = new Map<string, AbstractControl>();
    if (this.flatGroup) {
      for (const [id, ctrl] of Object.entries(this.flatGroup.controls)) {
        map.set(id, ctrl);
      }
    } else {
      this.stepGroups.forEach(sg => {
        Object.entries(sg.controls).forEach(([id, ctrl]) => map.set(id, ctrl));
      });
    }
    return map;
  }

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
      source: 'new' as const,
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
    return this.api.uploadFile(this.formId, fieldId, entry.file!).pipe(
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
        void this.liveAnnouncer.announce('Upload failed: ' + entry.file!.name, 'assertive');
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

        // Hydrate upload entries from server-persisted file records
        const rawFileRecords = raw['fileRecords'] as Array<{
          fileId: string; fieldId: string; filename: string;
          mimeType: string; size: number; url: string;
        }> | undefined;
        if (Array.isArray(rawFileRecords) && rawFileRecords.length > 0) {
          const hydrated = new Map(this.uploadEntries());
          for (const rec of rawFileRecords) {
            const entry: FileUploadEntry = {
              clientId: rec.fileId,
              source:   'server',
              status:   'done',
              filename: rec.filename,
              fileId:   rec.fileId,
              url:      rec.url,
            };
            const existing = hydrated.get(rec.fieldId) ?? [];
            hydrated.set(rec.fieldId, [...existing, entry]);
          }
          this.uploadEntries.set(hydrated);
        }

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
      tap(p => { this.pendingSave = p; }),
      debounceTime(this.autosaveDelay),
      tap(() => { this.pendingSave = null; this.autosaveStatus.set('saving'); }),
      switchMap(({ fieldId, value }) =>
        this.api.patchFormField(this.formId, fieldId, value).pipe(
          tap(() => {
            this.isDirty.set(false);
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
    const mergeStepValues = (): Record<string, unknown> => {
      const result: Record<string, unknown> = {};
      for (const group of this.stepGroups) Object.assign(result, group.value);
      return result;
    };
    this.currentValues.set(mergeStepValues());
    for (const group of this.stepGroups) {
      this.autosaveSub!.add(
        group.valueChanges.subscribe(() => this.currentValues.set(mergeStepValues())),
      );
      for (const [fieldId, control] of Object.entries(group.controls)) {
        this.autosaveSub!.add(control.valueChanges.subscribe((value) => {
          this.isDirty.set(true);
          this.autosave$.next({ fieldId, value });
        }));
      }
    }
  }

  private setupFlatAutosave(): void {
    if (!this.flatGroup) return;
    // Keep currentValues signal in sync with the flat group
    this.autosaveSub!.add(
      this.flatGroup.valueChanges.pipe(
        startWith(this.flatGroup.value),
      ).subscribe(v => this.currentValues.set(v as Record<string, unknown>)),
    );
    for (const [fieldId, control] of Object.entries(this.flatGroup.controls)) {
      this.autosaveSub!.add(control.valueChanges.subscribe((value) => {
        this.isDirty.set(true);
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
    // No Angular built-in validators — validationState() is the sole source of truth
    // for validation messages. Validators.required is intentionally omitted to prevent
    // Angular from generating its own error messages and to avoid conflicts with the
    // _errorSyncEffect which calls setErrors(null) on clean fields.
    switch (field.type) {
      case 'checkbox':
        return new FormControl(
          { value: (field.value as boolean | undefined) ?? false, disabled: field.disabled },
          []
        );
      case 'select': {
        return new FormControl(
          { value: (field as { value?: string }).value ?? '', disabled: field.disabled },
          []
        );
      }
      case 'multi-select': {
        const raw = (field as { value?: string[] }).value;
        return new FormControl(
          { value: Array.isArray(raw) ? raw : [], disabled: field.disabled },
          []
        );
      }
      case 'radio':
        return new FormControl<string | null>(
          { value: (field as { value?: string | null }).value ?? null, disabled: field.disabled ?? false },
          []
        );
      default:
        return new FormControl(
          { value: (field as { value?: string }).value ?? '', disabled: field.disabled },
          []
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
    // Also mark all visible fields in this step as dirty for inline error display
    const step = this.formDef()?.steps?.[stepIndex];
    if (step) {
      this.dirtyFieldIds.update(prev => {
        const next = new Set(prev);
        for (const field of step.fields) {
          next.add(field.id);
        }
        return next;
      });
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isDirty()) {
      event.preventDefault();
    }
  }

  markFieldDirty(fieldId: string): void {
    const current = this.dirtyFieldIds();
    if (current.has(fieldId)) return;
    const next = new Set(current);
    next.add(fieldId);
    this.dirtyFieldIds.set(next);
  }

  markAllDirty(): void {
    // formDef.fields is the canonical flat list of ALL fields (including step fields).
    // The steps.flatMap branch below is a defensive fallback for stepped-only forms
    // where formDef.fields may be empty. Both lists are unioned so the Set/Map operations
    // are idempotent (same field.id processed twice is harmless).
    const allFields = [
      ...(this.formDef()?.fields ?? []),
      ...(this.formDef()?.steps?.flatMap((s) => s.fields) ?? []),
    ];
    const allIds = allFields.map((f) => f.id);
    this.dirtyFieldIds.set(new Set(allIds));
  }

  onSubmitClicked(): void {
    this.markAllDirty();
    if (this.submitDisabled()) return;
    this.api.submitForm(this.formId).subscribe({
      next: (res) => {
        console.log('Form submitted at', res.submittedAt);
        this.snackBar.open('Form submitted successfully!', 'Dismiss', { duration: 4000 });
      },
      error: (err: HttpErrorResponse) => {
        console.error('Form submission failed', err);
        if (err.status === 422 && Array.isArray(err.error?.errors)) {
          const msgs = (err.error.errors as { fieldId: string; violations: string[] }[])
            .flatMap((e) => e.violations.map((v) => `${e.fieldId}: ${v}`))
            .slice(0, 5)
            .join('\n');
          this.snackBar.open('Validation errors:\n' + msgs, 'Dismiss', { duration: 8000 });
        } else {
          this.snackBar.open('Submission failed. Please try again.', 'Dismiss', { duration: 4000 });
        }
      },
    });
  }
}
