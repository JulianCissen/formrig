import { z } from 'zod';

/**
 * Structural field names that must never appear in a PATCH /forms/:id body.
 * Sending any of these returns HTTP 400 — defence-in-depth against definition tampering.
 */
export const STRUCTURAL_FIELDS = new Set([
  'pluginId', 'id', 'createdAt', 'updatedAt',
  'definition', 'fields', 'steps', 'type',
  'label', 'options', 'required', 'disabled',
  '__proto__', 'constructor', 'prototype',
]);

/** Single-field autosave payload */
export const PatchSingleFieldSchema = z.object({
  fieldId: z.string().min(1),
  value:   z.unknown(),
}).strict();

/** Batch values payload */
export const PatchBatchValuesSchema = z.object({
  values: z.record(z.string(), z.unknown()),
}).strict();

export const UpdateFormValuesSchema = z.union([
  PatchSingleFieldSchema,
  PatchBatchValuesSchema,
]);

export type UpdateFormValuesDto = z.infer<typeof UpdateFormValuesSchema>;
