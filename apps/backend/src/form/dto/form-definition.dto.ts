import { z } from 'zod';

/**
 * Zod schemas for the form definition API response contract.
 * TypeScript types are derived via z.infer — no separate interface needed.
 */

// This schema is mirrored in apps/frontend/src/app/models/field.model.ts — both must be kept in sync.
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

  /** Ordered list of option labels. Present for RadioField and SelectField. */
  options: z.array(z.string()).optional(),

  /** Whether multiple options may be selected. Present for SelectField when multiple is true. */
  multiple: z.boolean().optional(),

  /** Boolean toggle state. Present for CheckboxField. */
  checked: z.boolean().optional(),

  /** Visible row count for multi-line text. Present for TextareaField. */
  rows: z.number().optional(),

  /** When true, the frontend renders a mat-autocomplete instead of mat-select. Present for SelectField. */
  autocomplete: z.boolean().optional(),

  /** MIME-type filter string (e.g. '.pdf,image/*'). Present for FileUploadField. */
  accept: z.string().optional(),

  /** Maximum number of files selectable. Present for FileUploadField when set. */
  maxFiles: z.number().optional(),

  /** Maximum total size in bytes. Present for FileUploadField when set. */
  maxSizeBytes: z.number().optional(),
});

export const StepDtoSchema = z.object({
  /** Human-readable step label displayed in the stepper header. */
  label: z.string(),
  /** Optional description shown below the step label. */
  description: z.string().optional(),
  /** Ordered list of fields in this step. */
  fields: z.array(FieldDtoSchema),
});

export type StepDto = z.infer<typeof StepDtoSchema>;

export const FormDefinitionDtoSchema = z.object({
  /** Unique form identifier. */
  id: z.string(),

  /** Optional human-readable form title. */
  title: z.string().optional(),

  /** Ordered list of serialised fields. Always emitted in the response for backward compatibility. */
  fields: z.array(FieldDtoSchema),

  /** Optional step groupings. Present when the form uses a stepper layout. */
  steps: z.array(StepDtoSchema).optional(),
});

export type FieldDto = z.infer<typeof FieldDtoSchema>;
export type FormDefinitionDto = z.infer<typeof FormDefinitionDtoSchema>;
