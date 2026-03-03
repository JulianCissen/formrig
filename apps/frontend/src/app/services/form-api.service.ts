import { Injectable, inject } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { Observable }         from 'rxjs';
import {
  FormSummary,
  FormDetail,
  CreateFormPayload,
  FileRecordResponse,
  FormTypeSummary,
} from '../models/form-api.model';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class FormApiService {
  private readonly http = inject(HttpClient);

  /** POST /forms — create a new form */
  createForm(payload: CreateFormPayload): Observable<FormSummary> {
    return this.http.post<FormSummary>(`${API}/forms`, payload);
  }

  /** GET /forms — list all forms */
  listForms(): Observable<FormSummary[]> {
    return this.http.get<FormSummary[]>(`${API}/forms`);
  }

  /** GET /forms/:id — fetch merged definition */
  getForm(id: string): Observable<FormDetail> {
    return this.http.get<FormDetail>(`${API}/forms/${id}`);
  }

  /** PATCH /forms/:id — autosave a single field */
  patchFormField(id: string, fieldId: string, value: unknown): Observable<FormSummary> {
    return this.http.patch<FormSummary>(`${API}/forms/${id}`, { fieldId, value });
  }

  /** PATCH /forms/:id — autosave a batch of values */
  patchFormValues(id: string, values: Record<string, unknown>): Observable<FormSummary> {
    return this.http.patch<FormSummary>(`${API}/forms/${id}`, { values });
  }

  /** POST /forms/:id/files — upload a file for a field */
  uploadFile(id: string, fieldId: string, file: File): Observable<FileRecordResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<FileRecordResponse>(`${API}/forms/${id}/files?fieldId=${encodeURIComponent(fieldId)}`, formData);
  }

  /** GET /forms/types — list all loaded form-type plugins */
  getFormTypes(): Observable<FormTypeSummary[]> {
    return this.http.get<FormTypeSummary[]>(`${API}/forms/types`);
  }

  /** DELETE /forms/:id/files/:fileId — delete an uploaded file */
  deleteFile(formId: string, fileId: string): Observable<void> {
    return this.http.delete<void>(`${API}/forms/${formId}/files/${encodeURIComponent(fileId)}`);
  }

  /** POST /forms/:id/submit — submit a completed form */
  submitForm(formId: string): Observable<{ submittedAt: string }> {
    return this.http.post<{ submittedAt: string }>(`${API}/forms/${formId}/submit`, {});
  }

  /** DELETE /forms/:id — delete a form and all its files */
  deleteForm(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/forms/${id}`);
  }
}
