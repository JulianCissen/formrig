// Re-export shared field types so plugin authors have a single import point.
// Plugin authors: import { TextField, BaseField } from '@formrig/sdk'
// Field class types — for type annotations only.
// NOTE: to construct instances (e.g. new RadioField(…)), import from '@formrig/shared' directly.
export type { BaseField, TextField, RadioField, CheckboxField, SelectField, TextareaField } from '@formrig/shared';

// SDK-own types
export type { FormDefinition, FormEventContext, FormTypePlugin } from './types.js';

// Runtime export (not type-only — needed at runtime for PluginHost validator)
export { isFormTypePlugin, FormTypePluginSchema } from './validator.js';
