import { z } from 'zod';

// This schema mirrors apps/backend/src/form/dto/form-definition.dto.ts — both must be kept in sync.
export const FieldDtoSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  required: z.boolean(),
  disabled: z.boolean(),
  value: z.string().optional(),
  options: z.array(z.string()).optional(),
  multiple: z.boolean().optional(),
  checked: z.boolean().optional(),
  rows: z.number().optional(),
  autocomplete: z.boolean().optional(),
  // file-upload — kept in sync with apps/backend/src/form/dto/form-definition.dto.ts
  accept: z.string().optional(),
  maxFiles: z.number().optional(),
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
  /** Ordered list of serialised fields (always present — merged flat list). */
  fields: z.array(FieldDtoSchema),
  /** Optional step groupings. Present when the form uses steps. */
  steps: z.array(StepDtoSchema).optional(),
});

export type FieldDto = z.infer<typeof FieldDtoSchema>;
export type FormDefinitionDto = z.infer<typeof FormDefinitionDtoSchema>;
