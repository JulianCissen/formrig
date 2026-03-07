import type { FormDefinitionDto } from '@formrig/shared';
import type { FileRecordDto } from './file-record.dto';

export interface FormDetailDto extends FormDefinitionDto {
  formId:      string;
  pluginId:    string;
  title:       string;
  createdAt:   string;  // ISO-8601
  updatedAt:   string;
  submittedAt: string | null;
  fileRecords: FileRecordDto[];
}
