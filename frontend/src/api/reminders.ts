import { apiClient } from '@/lib/api';
import type { Reminder, PaginatedResponse } from '@/types';

export interface CreateReminderBody {
  title: string;
  applicationId?: string;
  dueAt: string;
}

export const remindersApi = {
  list: (params: { completed?: boolean; page?: number } = {}) =>
    apiClient.get<PaginatedResponse<Reminder>>('/reminders', { params }).then(r => r.data),

  create: (body: CreateReminderBody) =>
    apiClient.post<Reminder>('/reminders', body).then(r => r.data),

  complete: (id: string) =>
    apiClient.patch<Reminder>('/reminders/' + id + '/complete').then(r => r.data),

  delete: (id: string) =>
    apiClient.delete('/reminders/' + id),
};
