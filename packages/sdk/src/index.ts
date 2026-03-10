// Re-export shared field types so plugin authors have a single import point.
// Plugin authors: import { TextField, BaseField } from '@formrig/sdk'
// Field class types — for type annotations only.
// NOTE: to construct instances (e.g. new RadioField(…)), import from '@formrig/shared' directly.
export type { BaseField, TextField, RadioField, CheckboxField, SelectField, TextareaField, FileUploadField, MultiSelectField, DatePickerField, NumberField } from '@formrig/shared';

// SDK-own types
export type { FormDefinition, FormEventContext, FormTypePlugin, FileMeta, AVScanResult } from './types.js';

// Runtime export (not type-only — needed at runtime for PluginHost validator)
export { isFormTypePlugin, FormTypePluginSchema } from './validator.js';

export { IFileStoragePlugin } from './file-storage-plugin.js';
export { IAntivirusPlugin } from './antivirus-plugin.js';
export { FileStoragePluginSchema, isFileStoragePlugin, isAntivirusPlugin } from './validator.js';

// Rule types — type-only re-exports for plugin author type annotations
export type {
  Rule, EqualsRule, NotEqualsRule, IsEmptyRule, IsNotEmptyRule,
  ContainsRule, MatchesPatternRule, MinLengthRule, MaxLengthRule,
  MinCountRule, MaxCountRule, IsTrueRule, IsFalseRule,
  EqualsFieldRule, ComesAfterFieldRule, ComesBeforeFieldRule,
  OlderThanRule, YoungerThanRule, BeforeStaticDateRule, AfterStaticDateRule,
  MinValueRule, MaxValueRule,
} from '@formrig/shared';

// DTO boundary types — useful for plugin authors who need to type API responses
export type { FieldDto, StepDto, FormDefinitionDto } from '@formrig/shared';
