export interface FileUploadEntry {
  clientId:     string;
  source:       'new' | 'server';
  file?:        File;
  status:       'pending' | 'uploading' | 'done' | 'error';
  filename?:    string;      // server-returned filename
  fileId?:      string;      // server-returned file record id
  url?:         string;      // server-returned download URL
  errorMessage?: string;
}
