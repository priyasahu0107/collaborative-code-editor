/**
 * Project module type definitions.
 */

import type { ProjectVisibility } from '../../models/Project.model.js';

/**
 * Project creation request body.
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  defaultLanguage?: string;
}

/**
 * Project update request body.
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  defaultLanguage?: string;
  visibility?: ProjectVisibility;
}

/**
 * Project list query parameters.
 */
export interface ListProjectsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated project list response.
 */
export interface PaginatedProjectsResponse {
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    visibility: ProjectVisibility;
    defaultLanguage: string;
    fileCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
