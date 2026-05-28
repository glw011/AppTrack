import { apiClient } from '@/lib/api';
import type {
  Application, ApplicationDetail, ApplicationNote,
  PaginatedResponse, StatsResponse, ApplicationStatus,
} from '@/types';

export interface ListApplicationsParams {
  status?: ApplicationStatus;
  search?: string;
  remote?: boolean;
  sort?: 'created_at' | 'date_applied' | 'date_saved' | 'job_title';
  page?: number;
  limit?: number;
}

export interface CreateApplicationBody {
  jobTitle: string;
  companyId?: string;
  status?: ApplicationStatus;
  source?: 'manual' | 'pipeline';
  url?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  remote?: boolean;
  jobDescription?: string;
  dateSaved?: string;
  dateApplied?: string | null;
  notes?: string;
}

export const applicationsApi = {
  list: (params: ListApplicationsParams = {}) =>
    apiClient.get<PaginatedResponse<Application>>('/applications', { params }).then(r => r.data),

  stats: () =>
    apiClient.get<StatsResponse>('/applications/stats').then(r => r.data),

  exportCsv: () =>
    apiClient.get('/applications/export/csv', { responseType: 'blob' }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<ApplicationDetail>(`/applications/${id}`).then(r => r.data),

  create: (body: CreateApplicationBody) =>
    apiClient.post<Application>('/applications', body).then(r => r.data),

  update: (id: string, body: Partial<CreateApplicationBody>) =>
    apiClient.put<Application>(`/applications/${id}`, body).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/applications/${id}`),

  patchStatus: (id: string, status: ApplicationStatus) =>
    apiClient.patch<Application>(`/applications/${id}/status`, { status }).then(r => r.data),

  addNote: (id: string, body: string) =>
    apiClient.post<ApplicationNote>(`/applications/${id}/notes`, { body }).then(r => r.data),

  deleteNote: (id: string, noteId: string) =>
    apiClient.delete(`/applications/${id}/notes/${noteId}`),
};
