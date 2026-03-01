import { z } from 'zod';

// Per-type field schemas — unexported (implementation detail).
// Only the discriminated union and its inferred types are part of the public API.

const TextFieldDtoSchema = z.object({
  id:       z.string(),
  type:     z.literal('text'),
  label:    z.string(),
  required: z.boolean(),
  disabled: z.boolean(),
  value:    z.string().optional(),
});

const CheckboxFieldDtoSchema = z.object({
  id:       z.string(),
  type:     z.literal('checkbox'),
  label:    z.string(),
  required: z.boolean(),
  disabled: z.boolean(),
  value:    z.boolean().optional(),
});

const SelectFieldDtoSchema = z.object({
  id:           z.string(),
  type:         z.literal('select'),
  label:        z.string(),
  required:     z.boolean(),
  disabled:     z.boolean(),
  value:        z.string().optional(),
  options:      z.array(z.string()),
  autocomplete: z.boolean().optional(),
});

const MultiSelectFieldDtoSchema = z.object({
  id:           z.string(),
  type:         z.literal('multi-select'),
  label:        z.string(),
  required:     z.boolean(),
  disabled:     z.boolean(),
  value:        z.array(z.string()).optional(),
  options:      z.array(z.string()),
  autocomplete: z.boolean().optional(),
});

const RadioFieldDtoSchema = z.object({
  id:       z.string(),
  type:     z.literal('radio'),
  label:    z.string(),
  required: z.boolean(),
  disabled: z.boolean(),
  value:    z.string().optional(),
  options:  z.array(z.string()),
});

const TextareaFieldDtoSchema = z.object({
  id:       z.string(),
  type:     z.literal('textarea'),
  label:    z.string(),
  required: z.boolean(),
  disabled: z.boolean(),
  value:    z.string().optional(),
  rows:     z.number().optional(),
});

// FileUploadField intentionally omits `value` — files are uploaded separately via
// POST /api/forms/:id/files and are not stored in the scalar values JSONB map.
// The `multiple` flag IS present (needed by the file input element in the renderer).
const FileUploadFieldDtoSchema = z.object({
  id:           z.string(),
  type:         z.literal('file-upload'),
  label:        z.string(),
  required:     z.boolean(),
  disabled:     z.boolean(),
  accept:       z.string().optional(),
  maxFiles:     z.number().optional(),
  maxSizeBytes: z.number().optional(),
  multiple:     z.boolean().optional(),
});

/** Discriminated union of all field types. Parsed at the API boundary via safeParse. */
export const FieldDtoSchema = z.discriminatedUnion('type', [
  TextFieldDtoSchema,
  CheckboxFieldDtoSchema,
  SelectFieldDtoSchema,
  MultiSelectFieldDtoSchema,
  RadioFieldDtoSchema,
  TextareaFieldDtoSchema,
  FileUploadFieldDtoSchema,
]);

/** TypeScript type for a serialised field. Narrowable via field.type discriminant. */
export type FieldDto = z.infer<typeof FieldDtoSchema>;

export const StepDtoSchema = z.object({
  /** Human-readable step label. */
  label:       z.string(),
  /** Optional description shown below the step label. */
  description: z.string().optional(),
  /** Ordered list of fields in this step. */
  fields:      z.array(FieldDtoSchema),
});

export type StepDto = z.infer<typeof StepDtoSchema>;

export const FormDefinitionDtoSchema = z.object({
  /** Unique form identifier. */
  id:     z.string(),
  /** Optional human-readable form title. */
  title:  z.string().optional(),
  /** Ordered list of all serialised fields (merged flat list). */
  fields: z.array(FieldDtoSchema),
  /** Optional step groupings. */
  steps:  z.array(StepDtoSchema).optional(),
});

export type FormDefinitionDto = z.infer<typeof FormDefinitionDtoSchema>;
