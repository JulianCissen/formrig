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
