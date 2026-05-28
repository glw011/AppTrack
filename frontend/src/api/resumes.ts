import { apiClient } from '@/lib/api';
import type { Resume } from '@/types';

export const resumesApi = {
  list: () =>
    apiClient.get<Resume[]>('/resumes').then(r => r.data),

  upload: (file: File) => {
    const form = new FormData();
    form.append('resume', file);
    return apiClient.post<Resume>('/resumes', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  delete: (id: string) =>
    apiClient.delete('/resumes/' + id),
};
