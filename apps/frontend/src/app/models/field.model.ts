import { z } from 'zod';

export const FieldDtoSchema = z.object({
  /** Stable unique identifier for this field within the form. */
  id: z.string(),
  type: z.string(),
  label: z.string(),
  required: z.boolean(),
  disabled: z.boolean(),
  value: z.string().optional(),
});

export const FormDefinitionDtoSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  fields: z.array(FieldDtoSchema),
});

export type FieldDto = z.infer<typeof FieldDtoSchema>;
export type FormDefinitionDto = z.infer<typeof FormDefinitionDtoSchema>;
