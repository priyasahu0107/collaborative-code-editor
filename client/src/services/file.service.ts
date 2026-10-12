import api from './api';
import {
  ApiResponse,
  CreateFileRequest,
  FileEntry,
  RenameFileRequest,
  UpdateFileRequest,
} from '../types';

export const fileService = {
  // Create file or folder
  async createFile(
    projectId: string,
    data: CreateFileRequest
  ): Promise<ApiResponse<FileEntry>> {
    const response = await api.post<ApiResponse<FileEntry>>(
      `/api/v1/projects/${projectId}/files`,
      data
    );
    return response.data;
  },

  // List files in project
  async listFiles(
    projectId: string,
    params?: {
      path?: string;
      type?: 'file' | 'folder';
      recursive?: boolean;
    }
  ): Promise<ApiResponse<FileEntry[]>> {
    const response = await api.get<ApiResponse<FileEntry[]>>(
      `/api/v1/projects/${projectId}/files`,
      { params }
    );
    return response.data;
  },

  // Get file by ID
  async getFile(projectId: string, fileId: string): Promise<ApiResponse<FileEntry>> {
    const response = await api.get<ApiResponse<FileEntry>>(
      `/api/v1/projects/${projectId}/files/${fileId}`
    );
    return response.data;
  },

  // Update file content
  async updateFile(
    projectId: string,
    fileId: string,
    data: UpdateFileRequest
  ): Promise<ApiResponse<FileEntry>> {
    const response = await api.patch<ApiResponse<FileEntry>>(
      `/api/v1/projects/${projectId}/files/${fileId}`,
      data
    );
    return response.data;
  },

  // Rename file or folder
  async renameFile(
    projectId: string,
    fileId: string,
    data: RenameFileRequest
  ): Promise<ApiResponse<FileEntry>> {
    const response = await api.patch<ApiResponse<FileEntry>>(
      `/api/v1/projects/${projectId}/files/${fileId}/rename`,
      data
    );
    return response.data;
  },

  // Delete file or folder
  async deleteFile(
    projectId: string,
    fileId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/api/v1/projects/${projectId}/files/${fileId}`
    );
    return response.data;
  },
};
