import type { FieldDto, StepDto } from './field.model';

export interface FormSummary {
  id:        string;
  title:     string;
  pluginId:  string;
  createdAt: string;
  updatedAt: string;
}

export interface FormDetail extends FormSummary {
  /** Flat merged field list. Always present. */
  fields?: FieldDto[];
  /** Step groupings. Present only when the form uses steps. */
  steps?: StepDto[];
  /** Plugin definition id (e.g. "demo-form") */
  formId?: string;
}

export interface CreateFormPayload {
  pluginId: string;
  title:    string;
}

export interface PatchFormPayload {
  fieldId?: string;
  value?:   unknown;
  values?:  Record<string, unknown>;
}

export interface FileRecordResponse {
  id:       string;
  fieldId:  string;
  filename: string;
  mimeType: string;
  size:     number;
  url:      string;
}
