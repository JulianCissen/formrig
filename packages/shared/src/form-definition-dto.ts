import { z } from 'zod';
import { isSafePattern } from './regex-safety';
import { RuleDtoSchema } from './rule-dto';
import { ConditionTreeDtoSchema } from './condition-tree';

// Shared base — all properties common to every field type.
// NOT exported: it is an implementation detail. Only the union and its inferred types
// are part of the public API.
const BaseFieldDtoSchema = z.object({
  id:          z.string(),
  label:       z.string(),
  required:    z.boolean(),
  disabled:    z.boolean(),
  visibleWhen: ConditionTreeDtoSchema.optional(),
  rules:       z.array(RuleDtoSchema).optional(),
  hint:        z.string().optional(),
  info:        z.string().optional(),
});

const TextFieldDtoSchema = BaseFieldDtoSchema.extend({
  type:          z.literal('text'),
  value:         z.string().optional(),
  maxCharacters: z.number().int().positive().optional(),
  minCharacters: z.number().int().positive().optional(),
  pattern:       z.string().refine(isSafePattern, { message: 'Pattern is potentially unsafe (ReDoS)' }).optional(),
});

const CheckboxFieldDtoSchema = BaseFieldDtoSchema.extend({
  type:  z.literal('checkbox'),
  value: z.boolean().optional(),
});

const SelectFieldDtoSchema = BaseFieldDtoSchema.extend({
  type:         z.literal('select'),
  value:        z.string().nullable().optional(),
  options:      z.array(z.string()),
  autocomplete: z.boolean().optional(),
});

const MultiSelectFieldDtoSchema = BaseFieldDtoSchema.extend({
  type:         z.literal('multi-select'),
  value:        z.array(z.string()).optional(),
  options:      z.array(z.string()),
  autocomplete: z.boolean().optional(),
  minSelected:  z.number().int().positive().optional(),
  maxSelected:  z.number().int().positive().optional(),
});

const RadioFieldDtoSchema = BaseFieldDtoSchema.extend({
  type:    z.literal('radio'),
  value:   z.string().nullable().optional(),
  options: z.array(z.string()),
});

const TextareaFieldDtoSchema = BaseFieldDtoSchema.extend({
  type:          z.literal('textarea'),
  value:         z.string().optional(),
  rows:          z.number().optional(),
  maxCharacters: z.number().int().positive().optional(),
  minCharacters: z.number().int().positive().optional(),
});

// FileUploadField intentionally omits `value` — files are uploaded separately via
// POST /api/forms/:id/files and are not stored in the scalar values JSONB map.
// The `multiple` flag IS present (needed by the file input element in the renderer).
// visibleWhen and rules are now inherited from BaseFieldDtoSchema.
const FileUploadFieldDtoSchema = BaseFieldDtoSchema.extend({
  type:         z.literal('file-upload'),
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
