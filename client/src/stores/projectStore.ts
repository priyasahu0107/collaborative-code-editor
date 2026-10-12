import { create } from 'zustand';
import { Project } from '../types';
import { projectService } from '../services/project.service';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;

  // Actions
  fetchProjects: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }) => Promise<void>;
  fetchProject: (projectId: string) => Promise<void>;
  createProject: (data: { name: string; description?: string; defaultLanguage?: string }) => Promise<Project>;
  updateProject: (projectId: string, data: { name?: string; description?: string; defaultLanguage?: string; visibility?: 'private' | 'public' }) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  pagination: null,

  fetchProjects: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectService.listProjects(params);
      set({
        projects: response.data.projects,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch projects',
      });
    }
  },

  fetchProject: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectService.getProject(projectId);
      set({
        currentProject: response.data,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch project',
      });
      throw error;
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectService.createProject(data);
      const newProject = response.data;
      set((state) => ({
        projects: [newProject, ...state.projects],
        isLoading: false,
      }));
      return newProject;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to create project',
      });
      throw error;
    }
  },

  updateProject: async (projectId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectService.updateProject(projectId, data);
      const updatedProject = response.data;
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? updatedProject : p
        ),
        currentProject:
          state.currentProject?.id === projectId
            ? updatedProject
            : state.currentProject,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to update project',
      });
      throw error;
    }
  },

  deleteProject: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      await projectService.deleteProject(projectId);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
        currentProject:
          state.currentProject?.id === projectId ? null : state.currentProject,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to delete project',
      });
      throw error;
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  clearError: () => set({ error: null }),
}));
