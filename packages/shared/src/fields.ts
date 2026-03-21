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

  /** Optional natural-language context string for AI assistants to guide response generation. */
  aiContext?: string;

  public label: string;
  public required: boolean;
  public disabled: boolean;

  /**
   * @param label       Human-readable label displayed in the form UI.
   * @param required    Whether the field must have a non-empty value on submission.
   * @param disabled    Whether the field is rendered in a non-interactive disabled state.
   * @param hint        Optional persistent hint text displayed below the field input.
   * @param info        Optional contextual information shown via tooltip on an info icon.
   * @param rules       Optional list of soft-validation rules.
   * @param visibleWhen Optional visibility condition.
   */
  constructor({
    label,
    required = false,
    disabled = false,
    hint,
    info,
    aiContext,
    rules,
    visibleWhen,
  }: {
    label: string;
    required?: boolean;
    disabled?: boolean;
    hint?: string;
    info?: string;
    aiContext?: string;
    rules?: Rule[];
    visibleWhen?: ConditionTree;
  }) {
    this.label = label;
    this.required = required;
    this.disabled = disabled;
    this.hint = hint;
    this.info = info;
    this.aiContext = aiContext;
    this.rules = rules;
    this.visibleWhen = visibleWhen;
  }
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

  public value: string;

  /**
   * @param label         Human-readable label (passed to BaseField).
   * @param value         Current string value of the input. Default: empty string.
   * @param required      Inherited from BaseField. Default: false.
   * @param disabled      Inherited from BaseField. Default: false.
   * @param hint          Optional persistent hint text.
   * @param info          Optional tooltip info text.
   * @param rules         Optional validation rules.
   * @param visibleWhen   Optional visibility condition.
   * @param maxCharacters Soft validation: max allowed characters.
   * @param minCharacters Soft validation: min required characters.
   * @param pattern       Soft validation: regex pattern string.
   */
  constructor({
    label, value = '', required = false, disabled = false,
    hint, info, aiContext, rules, visibleWhen,
    maxCharacters, minCharacters, pattern,
  }: {
    label: string; value?: string; required?: boolean; disabled?: boolean;
    hint?: string; info?: string; aiContext?: string; rules?: Rule[]; visibleWhen?: ConditionTree;
    maxCharacters?: number; minCharacters?: number; pattern?: string;
  }) {
    super({ label, required, disabled, hint, info, aiContext, rules, visibleWhen });
    this.value = value;
    this.maxCharacters = maxCharacters;
    this.minCharacters = minCharacters;
    this.pattern = pattern;
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

  public options: string[];
  public value: string | null;

  /**
   * @param label      Human-readable label (passed to BaseField).
   * @param options    Ordered list of option labels.
   * @param value      Currently selected option label. Default: null.
   * @param required   Inherited from BaseField. Default: false.
   * @param disabled   Inherited from BaseField. Default: false.
   * @param hint       Optional persistent hint text.
   * @param info       Optional tooltip info text.
   * @param rules      Optional validation rules.
   * @param visibleWhen Optional visibility condition.
   */
  constructor({
    label, options, value = null, required = false, disabled = false,
    hint, info, aiContext, rules, visibleWhen,
  }: {
    label: string; options: string[]; value?: string | null;
    required?: boolean; disabled?: boolean;
    hint?: string; info?: string; aiContext?: string; rules?: Rule[]; visibleWhen?: ConditionTree;
  }) {
    super({ label, required, disabled, hint, info, aiContext, rules, visibleWhen });
    this.options = options;
    this.value = value;
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

  public value: boolean;

  /**
   * @param label      Human-readable label (passed to BaseField).
   * @param value      The boolean toggle state. Default: false.
   * @param required   Inherited from BaseField. Default: false.
   * @param disabled   Inherited from BaseField. Default: false.
   * @param hint       Optional persistent hint text.
   * @param info       Optional tooltip info text.
   * @param rules      Optional validation rules.
   * @param visibleWhen Optional visibility condition.
   */
  constructor({
    label, value = false, required = false, disabled = false,
    hint, info, aiContext, rules, visibleWhen,
  }: {
    label: string; value?: boolean; required?: boolean; disabled?: boolean;
    hint?: string; info?: string; aiContext?: string; rules?: Rule[]; visibleWhen?: ConditionTree;
  }) {
    super({ label, required, disabled, hint, info, aiContext, rules, visibleWhen });
    this.value = value;
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

  public options: string[];
  public value: string | null;
  public autocomplete: boolean;

  /**
   * @param label        Human-readable label (passed to BaseField).
   * @param options      Ordered list of selectable options.
   * @param value        Currently selected value. Default: null.
   * @param autocomplete When true, renders with `<mat-autocomplete>` instead of `<mat-select>`. Default: false.
   * @param required     Inherited from BaseField. Default: false.
   * @param disabled     Inherited from BaseField. Default: false.
   * @param hint         Optional persistent hint text.
   * @param info         Optional tooltip info text.
   * @param rules        Optional validation rules.
   * @param visibleWhen  Optional visibility condition.
   */
  constructor({
    label, options, value = null, autocomplete = false,
    required = false, disabled = false,
    hint, info, aiContext, rules, visibleWhen,
  }: {
    label: string; options: string[]; value?: string | null;
    autocomplete?: boolean; required?: boolean; disabled?: boolean;
    hint?: string; info?: string; aiContext?: string; rules?: Rule[]; visibleWhen?: ConditionTree;
  }) {
    super({ label, required, disabled, hint, info, aiContext, rules, visibleWhen });
    this.options = options;
    this.value = value;
    this.autocomplete = autocomplete;
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

  public options: string[];
  public value: string[];
  public autocomplete: boolean;

  /**
   * @param label        Human-readable label (passed to BaseField).
   * @param options      Ordered list of selectable options.
   * @param value        Currently selected values. Default: empty array.
   * @param autocomplete When true, renders with `<mat-autocomplete>` instead of `<mat-select [multiple]>`. Default: false.
   * @param required     Inherited from BaseField. Default: false.
   * @param disabled     Inherited from BaseField. Default: false.
   * @param hint         Optional persistent hint text.
   * @param info         Optional tooltip info text.
   * @param rules        Optional validation rules.
   * @param visibleWhen  Optional visibility condition.
   * @param minSelected  Soft validation: minimum items selected.
   * @param maxSelected  Soft validation: maximum items selected.
   */
  constructor({
    label, options, value = [], autocomplete = false,
    required = false, disabled = false,
    hint, info, aiContext, rules, visibleWhen,
    minSelected, maxSelected,
  }: {
    label: string; options: string[]; value?: string[];
    autocomplete?: boolean; required?: boolean; disabled?: boolean;
    hint?: string; info?: string; aiContext?: string; rules?: Rule[]; visibleWhen?: ConditionTree;
    minSelected?: number; maxSelected?: number;
  }) {
    super({ label, required, disabled, hint, info, aiContext, rules, visibleWhen });
    this.options = options;
    this.value = value;
    this.autocomplete = autocomplete;
    this.minSelected = minSelected;
    this.maxSelected = maxSelected;
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

  public value: string;
  public rows: number;

  /**
   * @param label         Human-readable label (passed to BaseField).
   * @param value         Current multi-line text content. Default: empty string.
   * @param rows          Visible row count hint rendered via `[rows]` binding. Default: 4.
   * @param required      Inherited from BaseField. Default: false.
   * @param disabled      Inherited from BaseField. Default: false.
   * @param hint          Optional persistent hint text.
   * @param info          Optional tooltip info text.
   * @param rules         Optional validation rules.
   * @param visibleWhen   Optional visibility condition.
   * @param maxCharacters Soft validation: max allowed characters.
   * @param minCharacters Soft validation: min required characters.
   */
  constructor({
    label, value = '', rows = 4, required = false, disabled = false,
    hint, info, aiContext, rules, visibleWhen,
    maxCharacters, minCharacters,
  }: {
    label: string; value?: string; rows?: number;
    required?: boolean; disabled?: boolean;
    hint?: string; info?: string; aiContext?: string; rules?: Rule[]; visibleWhen?: ConditionTree;
    maxCharacters?: number; minCharacters?: number;
  }) {
    super({ label, required, disabled, hint, info, aiContext, rules, visibleWhen });
    this.value = value;
    this.rows = rows;
    this.maxCharacters = maxCharacters;
    this.minCharacters = minCharacters;
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

  /** Whether the user may select more than one file at a time. Default: false. */
  public multiple: boolean;

  /** Comma-separated MIME types or file extensions passed to the native `<input accept>` attribute. Default: `''`. */
  public accept: string;

  /** Maximum number of files the user may attach. Default: undefined (no limit). */
  maxFiles?: number;

  /** Maximum total upload size in bytes. Default: undefined (no limit). */
  maxSizeBytes?: number;

  /**
   * Optional base name for stored files. When set, the backend uses this value instead of a random UUID
   * as the filename base (a `_${index}` suffix and the original file extension are always appended).
   */
  rename?: string;

  constructor({
    label, multiple = false, accept = '',
    maxFiles, maxSizeBytes, rename,
    required = false, disabled = false,
    hint, info, aiContext, rules, visibleWhen,
  }: {
    label: string; multiple?: boolean; accept?: string;
    maxFiles?: number; maxSizeBytes?: number; rename?: string;
    required?: boolean; disabled?: boolean;
    hint?: string; info?: string; aiContext?: string; rules?: Rule[]; visibleWhen?: ConditionTree;
  }) {
    super({ label, required, disabled, hint, info, aiContext, rules, visibleWhen });
    this.multiple = multiple;
    this.accept = accept;
    this.maxFiles = maxFiles;
    this.maxSizeBytes = maxSizeBytes;
    this.rename = rename;
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

  public value: string | null;

  /**
   * @param label         Human-readable label (passed to BaseField).
   * @param value         Current ISO date string value or null. Default: null.
   * @param required      Inherited from BaseField. Default: false.
   * @param disabled      Inherited from BaseField. Default: false.
   * @param hint          Optional persistent hint text.
   * @param info          Optional tooltip info text.
   * @param rules         Optional validation rules.
   * @param visibleWhen   Optional visibility condition.
   * @param minDate       Declarative calendar lower bound (yyyy-mm-dd).
   * @param maxDate       Declarative calendar upper bound (yyyy-mm-dd).
   * @param minAge        Minimum age in years.
   * @param maxAge        Maximum age in years.
   * @param displayFormat Display format for keyboard input.
   */
  constructor({
    label, value = null, required = false, disabled = false,
    hint, info, aiContext, rules, visibleWhen,
    minDate, maxDate, minAge, maxAge, displayFormat,
  }: {
    label: string; value?: string | null;
    required?: boolean; disabled?: boolean;
    hint?: string; info?: string; aiContext?: string; rules?: Rule[]; visibleWhen?: ConditionTree;
    minDate?: string; maxDate?: string; minAge?: number; maxAge?: number; displayFormat?: string;
  }) {
    super({ label, required, disabled, hint, info, aiContext, rules, visibleWhen });
    this.value = value;
    this.minDate = minDate;
    this.maxDate = maxDate;
    this.minAge = minAge;
    this.maxAge = maxAge;
    this.displayFormat = displayFormat;
  }
}

/**
 * Integer number input field.
 *
 * Maps to `<input type="text" inputmode="numeric">` in the Angular frontend.
 * The `type` literal `'number'` is used as the `@switch` discriminator in templates.
 * Value is stored as an integer or null (never a float).
 */
export class NumberField extends BaseField {
  /** Discriminator — always `'number'`. */
  readonly type = 'number' as const;

  /** Soft validation: minimum allowed integer value. Generates a MinValueRule. */
  min?: number;

  /** Soft validation: maximum allowed integer value. Generates a MaxValueRule. */
  max?: number;

  public value: number | null;

  /**
   * @param label       Human-readable label (passed to BaseField).
   * @param value       Current integer value or null. Default: null.
   * @param required    Inherited from BaseField. Default: false.
   * @param disabled    Inherited from BaseField. Default: false.
   * @param hint        Optional persistent hint text.
   * @param info        Optional tooltip info text.
   * @param rules       Optional validation rules.
   * @param visibleWhen Optional visibility condition.
   * @param min         Soft validation: minimum allowed integer value.
   * @param max         Soft validation: maximum allowed integer value.
   */
  constructor({
    label, value = null, required = false, disabled = false,
    hint, info, aiContext, rules, visibleWhen,
    min, max,
  }: {
    label: string; value?: number | null; required?: boolean; disabled?: boolean;
    hint?: string; info?: string; aiContext?: string; rules?: Rule[]; visibleWhen?: ConditionTree;
    min?: number; max?: number;
  }) {
    super({ label, required, disabled, hint, info, aiContext, rules, visibleWhen });
    this.value = value;
    this.min = min;
    this.max = max;
  }
}
