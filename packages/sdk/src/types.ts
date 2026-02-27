import type { BaseField, FormStep } from '@formrig/shared';

/**
 * The JSON-serialisable descriptor of a form.
 * Owned by the plugin's `definition` property.
 * The backend clones `fields` before passing them to event handlers
 * to prevent cross-request mutation of the plugin singleton.
 */
export interface FormDefinition {
  /** Unique form identifier. Becomes the `id` property of the API response. */
  id: string;

  /** Optional human-readable title rendered above the form. */
  title?: string;

  /**
   * Flat list of fields. Used when the form is NOT divided into steps.
   *
   * **At least one of `fields` or `steps` must be provided.** A `FormDefinition`
   * with neither `fields` nor `steps` is invalid and the backend will throw.
   *
   * When `steps` is also present, `fields` is ignored in favour of deriving
   * the flat list from `steps`.
   */
  fields?: BaseField[];

  /**
   * Ordered list of form steps. When present and non-empty, the form renderer
   * displays a `MatStepper` with one panel per step.
   *
   * **At least one of `fields` or `steps` must be provided.** Providing `steps`
   * alone (without `fields`) is the recommended pattern for multi-step forms.
   * The backend service derives `FormEventContext.fields` by flattening all
   * step fields in order — event handlers always receive a complete flat list
   * regardless of whether the plugin used `fields` or `steps`.
   *
   * **Constraint on event handlers:** handlers MUST NOT add or remove elements
   * from `ctx.fields`. Only mutating field _values_ is supported. Adding/removing
   * fields would corrupt the step-boundary slicing used when serialising the
   * response.
   */
  steps?: FormStep[];
}

/**
 * Passed to every event handler. Handlers mutate `fields` in-place.
 *
 * The backend constructs a fresh shallow-cloned copy of the plugin's
 * `definition.fields` for every request, assigns it here, then passes
 * the context to the handler. The mutated array is subsequently serialised
 * and returned as the HTTP response.
 */
export interface FormEventContext {
  /**
   * Shallow-cloned, per-request copy of the form's fields. Mutable.
   *
   * When the plugin definition uses `steps`, this array is the merged flat
   * list of all step fields (in step order, preserving intra-step order).
   * Handlers MUST NOT add or remove elements — only mutate field values.
   */
  fields: BaseField[];
}

/**
 * Contract that every form type plugin must satisfy.
 * Used as the generic type parameter: `PluginHost<FormTypePlugin>`.
 *
 * A plugin is a module whose default export is an object implementing
 * this interface. The moduul host validates the export at load time
 * using `isFormTypePlugin`.
 */
export interface FormTypePlugin {
  /**
   * Descriptive definition of the form: id, title, and initial field list.
   * This object is owned by the plugin singleton and must NOT be mutated
   * by the host. Clone `definition.fields` before passing to event handlers.
   */
  readonly definition: FormDefinition;

  events: {
    /**
     * Called server-side when a form instance is first created / opened.
     * The handler may prefill or adjust field values by mutating `ctx.fields`
     * in-place. No return value is used.
     *
     * @param ctx - Per-request context containing a cloned copy of the fields.
     */
    created(ctx: FormEventContext): Promise<void>;

    /**
     * Called when a form submission event occurs.
     * For MVP this handler is part of the interface contract but is not
     * invoked by any HTTP endpoint.
     *
     * @param ctx - Per-request context containing the submitted fields.
     */
    submitted(ctx: FormEventContext): Promise<void>;
  };
}

/**
 * Metadata attached to every file traversing the upload pipeline.
 * `size` is -1 when the Content-Length header is absent; consumers must tolerate -1.
 */
export interface FileMeta {
  mimeType: string;
  /** File size in bytes. -1 when unknown (Content-Length header absent). */
  size: number;
  originalName: string;
}

/**
 * Result returned by an {@link IAntivirusPlugin} scan.
 */
export interface AVScanResult {
  clean: boolean;
  /** Human-readable threat name when clean === false. */
  threat?: string;
}


