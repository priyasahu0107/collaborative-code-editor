// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: User;
}

// Project types
export type ProjectVisibility = 'private' | 'public';

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  visibility: ProjectVisibility;
  defaultLanguage: string;
  fileCount: number;
  lastOpenedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  defaultLanguage?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  defaultLanguage?: string;
  visibility?: ProjectVisibility;
}

export interface ProjectListResponse {
  success: boolean;
  message: string;
  data: {
    projects: Project[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// File types
export type FileEntryType = 'file' | 'folder';

export interface FileEntry {
  id: string;
  projectId: string;
  name: string;
  path: string;
  type: FileEntryType;
  language?: string;
  content?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFileRequest {
  name: string;
  path?: string;
  type: FileEntryType;
  language?: string;
  content?: string;
}

export interface UpdateFileRequest {
  content?: string;
  language?: string;
  version: number;
}

export interface RenameFileRequest {
  newName: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  error: {
    code: string;
    statusCode: number;
    details?: any;
  };
}

// Editor types
export interface OpenFile {
  id: string;
  name: string;
  path: string;
  language?: string;
  content: string;
  version: number;
  isDirty: boolean;
  isSaving: boolean;
}

export interface EditorState {
  openFiles: OpenFile[];
  activeFileId: string | null;
}
