export interface FileRecordDto {
  fileId:   string;   // FileRecord.id (UUID)
  fieldId:  string;
  filename: string;
  mimeType: string;
  size:     number;
  url:      string;   // /api/forms/:formId/files/:fileId/download
}
