import { z } from 'zod';

/**
 * Zod schemas for the form definition API response contract.
 * TypeScript types are derived via z.infer — no separate interface needed.
 */

export const FieldDtoSchema = z.object({
  /** Stable unique identifier for this field within the form. */
  id: z.string(),

  /** Discriminator string (e.g. 'text'). Mirrors BaseField.type. */
  type: z.string(),

  /** Human-readable label. */
  label: z.string(),

  /** Whether the field is required. */
  required: z.boolean(),

  /** Whether the field is disabled. */
  disabled: z.boolean(),

  /** Current string value. Present only for value-bearing fields (e.g. TextField). */
  value: z.string().optional(),
});

export const FormDefinitionDtoSchema = z.object({
  /** Unique form identifier. */
  id: z.string(),

  /** Optional human-readable form title. */
  title: z.string().optional(),

  /** Ordered list of serialised fields. */
  fields: z.array(FieldDtoSchema),
});

export type FieldDto = z.infer<typeof FieldDtoSchema>;
export type FormDefinitionDto = z.infer<typeof FormDefinitionDtoSchema>;
