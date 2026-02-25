// Re-export shared field types so plugin authors have a single import point.
// Plugin authors: import { TextField, BaseField } from '@formrig/sdk'
export type { BaseField, TextField } from '@formrig/shared';

// SDK-own types
export type { FormDefinition, FormEventContext, FormTypePlugin } from './types.js';

// Runtime export (not type-only — needed at runtime for PluginHost validator)
export { isFormTypePlugin, FormTypePluginSchema } from './validator.js';
