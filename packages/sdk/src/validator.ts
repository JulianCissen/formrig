import { z } from 'zod';
import type { FormTypePlugin } from './types.js';

/**
 * Zod 4 schema that validates the structural contract of a FormTypePlugin.
 *
 * - `fields` uses z.array(z.unknown()) because the SDK does not own the BaseField
 *   class hierarchy. Deep field validation is the plugin's responsibility.
 * - `.passthrough()` permits plugins to attach extra metadata without failing validation.
 * - z.function() confirms callability; Zod cannot introspect function signatures at runtime.
 */
export const FormTypePluginSchema = z.object({
  definition: z.object({
    id: z.string(),
    title: z.string().optional(),
    fields: z.array(z.unknown()),
  }),
  events: z.object({
    created: z.function(),
    submitted: z.function(),
  }),
}).passthrough();

/**
 * Runtime type-guard used as the `validator` option of `PluginHost<FormTypePlugin>`.
 *
 * Public API signature is UNCHANGED: (p: unknown): p is FormTypePlugin.
 * Implementation now delegates to FormTypePluginSchema.safeParse for Zod-based validation.
 *
 * @param p - The unknown value loaded from the plugin module's default export.
 * @returns `true` if `p` satisfies the `FormTypePlugin` shape.
 */
export function isFormTypePlugin(p: unknown): p is FormTypePlugin {
  return FormTypePluginSchema.safeParse(p).success;
}
