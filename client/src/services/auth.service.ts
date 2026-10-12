import api from './api';
import { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export const authService = {
  // Login
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/v1/auth/login', data);
    return response.data;
  },

  // Register
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/v1/auth/register', data);
    return response.data;
  },

  // Get current user
  async getCurrentUser(): Promise<AuthResponse> {
    const response = await api.get<AuthResponse>('/api/v1/auth/me');
    return response.data;
  },

  // Logout
  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>('/api/v1/auth/logout');
    return response.data;
  },
};
