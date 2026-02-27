import type { FormDefinitionDto } from './form-definition.dto';

export interface FormDetailDto extends FormDefinitionDto {
  formId:    string;
  pluginId:  string;
  title:     string;
  createdAt: string;  // ISO-8601
  updatedAt: string;
}
