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

export const FormDefinitionDtoSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  fields: z.array(FieldDtoSchema),
});

export type FieldDto = z.infer<typeof FieldDtoSchema>;
export type FormDefinitionDto = z.infer<typeof FormDefinitionDtoSchema>;
