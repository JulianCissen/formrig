import type { BaseField } from '@formrig/shared';

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
   * Ordered list of fields that make up the form.
   * Uses the `BaseField` class hierarchy so `type` discriminators are always present.
   */
  fields: BaseField[];
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
  /** Shallow-cloned, per-request copy of the form's fields. Mutable. */
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
