import type { Rule } from './rule';
import type { ConditionTree } from './condition-tree';

/**
 * Abstract base for all field types.
 *
 * The `type` property is a lowercase string constant defined as a readonly
 * literal on each concrete subclass. It survives JSON serialisation and enables
 * discriminated-union narrowing in templates without a class registry.
 *
 * Open/Closed principle: adding a new field type requires only a new subclass —
 * BaseField and existing subclasses are never modified.
 */
export abstract class BaseField {
  /** Discriminator string. Each subclass sets this to a unique lowercase literal. */
  abstract readonly type: string;

  /** Optional list of soft-validation rules evaluated in the frontend and at submit time. */
  rules?: Rule[];

  /** Optional visibility condition. When absent or undefined, the field is always visible. */
  visibleWhen?: ConditionTree;

  /**
   * Optional persistent hint text displayed below the field input.
   * Rendered via `mat-hint` (mat-form-field fields) or a `<p class="field-hint">` element.
   */
  hint?: string;

  /**
   * Optional contextual information string. When set, an info icon button is rendered
   * next to the field; hovering or focusing the button shows this text as a tooltip.
   */
  info?: string;

  /**
   * @param label    Human-readable label displayed in the form UI.
   * @param required Whether the field must have a non-empty value on submission.
   * @param disabled Whether the field is rendered in a non-interactive disabled state.
   */
  constructor(
    public label: string,
    public required: boolean = false,
    public disabled: boolean = false,
  ) {}
}

/**
 * Single-line text input field.
 *
 * Maps to `<input matInput type="text">` in the Angular frontend.
 * The `type` literal `'text'` is used as the `@switch` discriminator in templates.
 */
export class TextField extends BaseField {
  /** Discriminator — always `'text'`. */
  readonly type = 'text' as const;

  /** Soft validation: max allowed characters. Generates a MaxLengthRule and a character counter UI affordance. */
  maxCharacters?: number;

  /** Soft validation: min required characters. Generates a MinLengthRule. */
  minCharacters?: number;

  /** Soft validation: regex pattern string. Generates a MatchesPatternRule. */
  pattern?: string;

  /**
   * @param label    Human-readable label (passed to BaseField).
   * @param value    Current string value of the input. Default: empty string.
   * @param required Inherited from BaseField. Default: false.
   * @param disabled Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public value: string = '',
    required: boolean = false,
    disabled: boolean = false,
  ) {
    super(label, required, disabled);
  }
}

/**
 * Radio button group field.
 *
 * Maps to `<mat-radio-group>` / `<mat-radio-button>` in the Angular frontend.
 * The `type` literal `'radio'` is used as the `@switch` discriminator in templates.
 */
export class RadioField extends BaseField {
  /** Discriminator — always `'radio'`. */
  readonly type = 'radio' as const;

  /**
   * @param label    Human-readable label (passed to BaseField).
   * @param options  Ordered list of option labels.
   * @param value    Currently selected option label. Default: null.
   * @param required Inherited from BaseField. Default: false.
   * @param disabled Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public options: string[],
    public value: string | null = null,
    required: boolean = false,
    disabled: boolean = false,
  ) {
    super(label, required, disabled);
  }
}

/**
 * Single checkbox toggle field.
 *
 * Maps to `<mat-checkbox>` in the Angular frontend.
 * The `type` literal `'checkbox'` is used as the `@switch` discriminator in templates.
 *
 * Note: the `required` property is always ignored for checkboxes — a checkbox cannot be
 * made required via the `required` flag. Use `IsTrueRule` explicitly if the checkbox
 * must be checked.
 */
export class CheckboxField extends BaseField {
  /** Discriminator — always `'checkbox'`. */
  readonly type = 'checkbox' as const;

  /**
   * @param label    Human-readable label (passed to BaseField).
   * @param value    The boolean toggle state. Default: false.
   * @param required Inherited from BaseField. Default: false.
   * @param disabled Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public value: boolean = false,
    required: boolean = false,
    disabled: boolean = false,
  ) {
    super(label, required, disabled);
  }
}

/**
 * Dropdown select field.
 *
 * Maps to `<mat-select>` (or `<input matInput [matAutocomplete]>`) in the Angular frontend.
 * The `type` literal `'select'` is used as the `@switch` discriminator in templates.
 */
export class SelectField extends BaseField {
  /** Discriminator — always `'select'`. */
  readonly type = 'select' as const;

  /**
   * @param label        Human-readable label (passed to BaseField).
   * @param options      Ordered list of selectable options.
   * @param value        Currently selected value. Default: null.
   * @param autocomplete When true, renders with `<mat-autocomplete>` instead of `<mat-select>`. Default: false.
   * @param required     Inherited from BaseField. Default: false.
   * @param disabled     Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public options: string[],
    public value: string | null = null,
    public autocomplete: boolean = false,
    required: boolean = false,
    disabled: boolean = false,
  ) {
    super(label, required, disabled);
  }
}

/**
 * Multi-select dropdown field.
 *
 * Maps to `<mat-select [multiple]="true">` in the Angular frontend.
 * The `type` literal `'multi-select'` is used as the `@switch` discriminator in templates.
 */
export class MultiSelectField extends BaseField {
  /** Discriminator — always `'multi-select'`. */
  readonly type = 'multi-select' as const;

  /** Soft validation: minimum number of items that must be selected. Generates a MinCountRule. */
  minSelected?: number;

  /** Soft validation: maximum number of items that may be selected. Generates a MaxCountRule. */
  maxSelected?: number;

  /**
   * @param label        Human-readable label (passed to BaseField).
   * @param options      Ordered list of selectable options.
   * @param value        Currently selected values. Default: empty array.
   * @param autocomplete When true, renders with `<mat-autocomplete>` instead of `<mat-select [multiple]>`. Default: false.
   * @param required     Inherited from BaseField. Default: false.
   * @param disabled     Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public options: string[],
    public value: string[] = [],
    public autocomplete: boolean = false,
    required: boolean = false,
    disabled: boolean = false,
  ) {
    super(label, required, disabled);
  }
}

/**
 * Multi-line textarea field.
 *
 * Maps to `<textarea matInput>` in the Angular frontend.
 * The `type` literal `'textarea'` is used as the `@switch` discriminator in templates.
 */
export class TextareaField extends BaseField {
  /** Discriminator — always `'textarea'`. */
  readonly type = 'textarea' as const;

  /** Soft validation: max allowed characters. Generates a MaxLengthRule and a character counter UI affordance. */
  maxCharacters?: number;

  /** Soft validation: min required characters. Generates a MinLengthRule. */
  minCharacters?: number;

  /**
   * @param label    Human-readable label (passed to BaseField).
   * @param value    Current multi-line text content. Default: empty string.
   * @param rows     Visible row count hint rendered via `[rows]` binding. Default: 4.
   * @param required Inherited from BaseField. Default: false.
   * @param disabled Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public value: string = '',
    public rows: number = 4,
    required: boolean = false,
    disabled: boolean = false,
  ) {
    super(label, required, disabled);
  }
}

/**
 * File upload drop-zone field.
 *
 * Renders as a custom drag-and-drop zone wrapping a hidden native
 * `<input type="file">` in the Angular frontend.
 * The `type` literal `'file-upload'` is used as the `@switch` discriminator
 * in templates.
 */
export class FileUploadField extends BaseField {
  /** Discriminator — always `'file-upload'`. */
  readonly type = 'file-upload' as const;

  /**
   * @param label        Human-readable label (passed to BaseField).
   * @param multiple     Whether the user may select more than one file at a time. Default: false.
   * @param accept       Comma-separated MIME types or file extensions passed to the native
   *                     `<input accept>` attribute. Default: `''` (all file types allowed).
   * @param maxFiles     Maximum number of files the user may attach. Default: undefined (no limit).
   * @param maxSizeBytes Maximum total upload size in bytes. Default: undefined (no limit).
   * @param rename       Optional base name for stored files. When set, the backend uses this
   *                     value instead of a random UUID as the filename base (a `_${index}` suffix
   *                     and the original file extension are always appended). Default: undefined.
   * @param required     Inherited from BaseField. Default: false.
   * @param disabled     Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public multiple: boolean = false,
    public accept: string = '',
    public maxFiles?: number,
    public maxSizeBytes?: number,
    public rename?: string,
    required: boolean = false,
    disabled: boolean = false,
  ) {
    super(label, required, disabled);
  }
}

/**
 * A named group of fields representing one step in a multi-step form.
 *
 * Plugin authors populate `FormDefinition.steps` with an ordered array of
 * `FormStep` objects. The form renderer walks through them in order,
 * presenting one step at a time, and only allows the user to proceed to the
 * next step once all required fields in the current step are valid.
 *
 * @example
 * ```ts
 * const definition: FormDefinition = {
 *   id: 'onboarding',
 *   steps: [
 *     { label: 'Personal Details', fields: [new TextField('Full name', '', true)] },
 *     { label: 'Preferences',      fields: [new SelectField('Country', ['UK', 'US'])] },
 *   ],
 * };
 * ```
 */
export interface FormStep {
  /** Human-readable step label displayed in the stepper header. */
  label: string;
  /** Optional description displayed below the label in the stepper header. */
  description?: string;
  /** Ordered list of fields rendered inside this step's panel. */
  fields: BaseField[];
}

/**
 * Date picker field.
 *
 * Maps to `<mat-datepicker>` in the Angular frontend.
 * The `type` literal `'date-picker'` is used as the `@switch` discriminator in templates.
 * Value is stored as an ISO 8601 date string (`yyyy-mm-dd`) or null.
 */
export class DatePickerField extends BaseField {
  /** Discriminator — always `'date-picker'`. */
  readonly type = 'date-picker' as const;

  /**
   * Declarative calendar lower bound (earliest selectable date).
   * Format: `yyyy-mm-dd`. Frontend hint only — does not generate a rule.
   */
  minDate?: string;

  /**
   * Declarative calendar upper bound (latest selectable date).
   * Format: `yyyy-mm-dd`. Frontend hint only — does not generate a rule.
   */
  maxDate?: string;

  /**
   * Minimum age in years (positive integer).
   * Used as a calendar upper bound (latest birthdate = today − minAge years).
   * Frontend hint only — does not generate a rule.
   */
  minAge?: number;

  /**
   * Maximum age in years (positive integer).
   * Used as a calendar lower bound (earliest birthdate = today − maxAge years).
   * Frontend hint only — does not generate a rule.
   */
  maxAge?: number;

  /**
   * Display format for keyboard input and the format hint.
   * Valid format string: each of the tokens `dd`, `mm`, `yyyy` exactly once,
   * separated by any single non-digit character. Examples: `'dd-mm-yyyy'`,
   * `'mm/dd/yyyy'`, `'yyyy.mm.dd'`.
   * When absent, the frontend defaults to `'dd-mm-yyyy'`.
   * This is a frontend-only property; it is not used by the backend.
   */
  displayFormat?: string;

  /**
   * @param label    Human-readable label (passed to BaseField).
   * @param value    Current ISO date string value or null. Default: null.
   * @param required Inherited from BaseField. Default: false.
   * @param disabled Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public value: string | null = null,
    required: boolean = false,
    disabled: boolean = false,
  ) {
    super(label, required, disabled);
  }
}
