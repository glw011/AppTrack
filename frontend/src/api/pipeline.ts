import { apiClient } from '@/lib/api';
import type { UserProfile, SearchConfig, PipelineRun } from '@/types';

export interface UpdateProfileBody {
  headline?: string;
  summary?: string;
  skills?: string[];
  technologies?: string[];
  certifications?: string[];
  yearsExperience?: number;
}

export interface UpdateSearchConfigBody {
  targetTitles?: string[];
  requiredKeywords?: string[];
  excludedCompanies?: string[];
  preferredIndustries?: string[];
  minSalary?: number | null;
  remotePreference?: 'remote' | 'hybrid' | 'onsite' | 'any';
  location?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior';
}

export const pipelineApi = {
  getProfile: () =>
    apiClient.get<UserProfile | null>('/pipeline/profile').then(r => r.data),

  updateProfile: (body: UpdateProfileBody) =>
    apiClient.put<UserProfile>('/pipeline/profile', body).then(r => r.data),

  getSearchConfig: () =>
    apiClient.get<SearchConfig | null>('/pipeline/search-config').then(r => r.data),

  updateSearchConfig: (body: UpdateSearchConfigBody) =>
    apiClient.put<SearchConfig>('/pipeline/search-config', body).then(r => r.data),

  toggleSearchConfig: () =>
    apiClient.patch<SearchConfig>('/pipeline/search-config/toggle').then(r => r.data),

  getRuns: (params: { component?: string; limit?: number } = {}) =>
    apiClient.get<PipelineRun[]>('/pipeline/runs', { params }).then(r => r.data),

  trigger: (component: 'search' | 'draft' | 'submission') =>
    apiClient.post<{ runId: string; component: string; status: string }>(
      '/pipeline/trigger/' + component,
    ).then(r => r.data),

  getReviewData: (applicationId: string, token: string) =>
    apiClient.get(`/pipeline/review/${applicationId}`, { params: { token } }).then(r => r.data),

  getDraftData: (applicationId: string) =>
    apiClient.get(`/pipeline/review/${applicationId}`).then(r => r.data),

  submitRejectFeedback: (token: string, feedback: string) =>
    apiClient.post('/pipeline/reject', { token, feedback }).then(r => r.data),
};
