import { apiClient } from '@/lib/api';
import type { Contact, PaginatedResponse } from '@/types';

export interface CreateContactBody {
  name: string;
  applicationId?: string;
  title?: string;
  email?: string;
  linkedinUrl?: string;
  notes?: string;
}

export const contactsApi = {
  list: (params: { applicationId?: string; search?: string; page?: number } = {}) =>
    apiClient.get<PaginatedResponse<Contact>>('/contacts', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<Contact>('/contacts/' + id).then(r => r.data),

  create: (body: CreateContactBody) =>
    apiClient.post<Contact>('/contacts', body).then(r => r.data),

  update: (id: string, body: Partial<CreateContactBody>) =>
    apiClient.put<Contact>('/contacts/' + id, body).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete('/contacts/' + id),
};
