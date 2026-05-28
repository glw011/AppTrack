import { apiClient } from '@/lib/api';
import type { User } from '@/types';

export interface LoginBody { email: string; password: string }
export interface RegisterBody { email: string; password: string; name: string }
export interface AuthResponse { token: string; user: User }

export const authApi = {
  login: (body: LoginBody) =>
    apiClient.post<AuthResponse>('/auth/login', body).then(r => r.data),

  register: (body: RegisterBody) =>
    apiClient.post<AuthResponse>('/auth/register', body).then(r => r.data),

  me: () => apiClient.get<User>('/auth/me').then(r => r.data),
};
