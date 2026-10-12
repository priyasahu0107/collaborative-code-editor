import api from './api';
import {
  ApiResponse,
  CreateProjectRequest,
  Project,
  ProjectListResponse,
  UpdateProjectRequest,
} from '../types';

export const projectService = {
  // Create project
  async createProject(data: CreateProjectRequest): Promise<ApiResponse<Project>> {
    const response = await api.post<ApiResponse<Project>>('/api/v1/projects', data);
    return response.data;
  },

  // List projects
  async listProjects(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Promise<ProjectListResponse> {
    const response = await api.get<ProjectListResponse>('/api/v1/projects', { params });
    return response.data;
  },

  // Get project by ID
  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    const response = await api.get<ApiResponse<Project>>(`/api/v1/projects/${projectId}`);
    return response.data;
  },

  // Update project
  async updateProject(
    projectId: string,
    data: UpdateProjectRequest
  ): Promise<ApiResponse<Project>> {
    const response = await api.patch<ApiResponse<Project>>(`/api/v1/projects/${projectId}`, data);
    return response.data;
  },

  // Delete project
  async deleteProject(projectId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/api/v1/projects/${projectId}`
    );
    return response.data;
  },
};
