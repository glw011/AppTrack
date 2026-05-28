import { apiClient } from '@/lib/api';
import type { Company, PaginatedResponse } from '@/types';

export interface CreateCompanyBody {
  name: string;
  website?: string;
  industry?: string;
  notes?: string;
}

export const companiesApi = {
  list: (params: { search?: string; page?: number; limit?: number } = {}) =>
    apiClient.get<PaginatedResponse<Company>>('/companies', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<Company>('/companies/' + id).then(r => r.data),

  create: (body: CreateCompanyBody) =>
    apiClient.post<Company>('/companies', body).then(r => r.data),

  update: (id: string, body: Partial<CreateCompanyBody>) =>
    apiClient.put<Company>('/companies/' + id, body).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete('/companies/' + id),
};
