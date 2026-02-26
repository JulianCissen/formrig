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
   * @param value    Currently selected option label. Default: empty string.
   * @param required Inherited from BaseField. Default: false.
   * @param disabled Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public options: string[],
    public value: string = '',
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
 */
export class CheckboxField extends BaseField {
  /** Discriminator — always `'checkbox'`. */
  readonly type = 'checkbox' as const;

  /**
   * @param label    Human-readable label (passed to BaseField).
   * @param checked  The boolean toggle state. Default: false.
   * @param required Inherited from BaseField. Default: false.
   * @param disabled Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public checked: boolean = false,
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
   * @param value        Selected value(s); `string[]` when `multiple` is true. Default: empty string.
   * @param multiple     Whether multiple options may be selected simultaneously. Default: false.
   * @param autocomplete When true, renders with `<mat-autocomplete>` instead of `<mat-select>`. Default: false.
   * @param required     Inherited from BaseField. Default: false.
   * @param disabled     Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public options: string[],
    public value: string | string[] = '',
    public multiple: boolean = false,
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
   * @param required     Inherited from BaseField. Default: false.
   * @param disabled     Inherited from BaseField. Default: false.
   */
  constructor(
    label: string,
    public multiple: boolean = false,
    public accept: string = '',
    public maxFiles?: number,
    public maxSizeBytes?: number,
    required: boolean = false,
    disabled: boolean = false,
  ) {
    super(label, required, disabled);
  }
}
