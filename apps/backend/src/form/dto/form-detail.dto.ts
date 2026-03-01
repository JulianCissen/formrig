import type { FormDefinitionDto } from '@formrig/shared';

export interface FormDetailDto extends FormDefinitionDto {
  formId:    string;
  pluginId:  string;
  title:     string;
  createdAt: string;  // ISO-8601
  updatedAt: string;
}
