import { create } from 'zustand';
import { FileEntry } from '../types';
import { fileService } from '../services/file.service';

interface FileState {
  files: FileEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFiles: (projectId: string, params?: { path?: string; type?: 'file' | 'folder'; recursive?: boolean }) => Promise<void>;
  createFile: (projectId: string, data: { name: string; path?: string; type: 'file' | 'folder'; language?: string; content?: string }) => Promise<FileEntry>;
  updateFile: (projectId: string, fileId: string, data: { content?: string; language?: string; version: number }) => Promise<FileEntry>;
  renameFile: (projectId: string, fileId: string, newName: string) => Promise<void>;
  deleteFile: (projectId: string, fileId: string) => Promise<void>;
  clearError: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: [],
  isLoading: false,
  error: null,

  fetchFiles: async (projectId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fileService.listFiles(projectId, params);
      set({
        files: response.data,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch files',
      });
    }
  },

  createFile: async (projectId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fileService.createFile(projectId, data);
      const newFile = response.data;
      set((state) => ({
        files: [...state.files, newFile],
        isLoading: false,
      }));
      return newFile;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to create file',
      });
      throw error;
    }
  },

  updateFile: async (projectId, fileId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fileService.updateFile(projectId, fileId, data);
      const updatedFile = response.data;
      set((state) => ({
        files: state.files.map((f) =>
          f.id === fileId ? updatedFile : f
        ),
        isLoading: false,
      }));
      return updatedFile;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to update file',
      });
      throw error;
    }
  },

  renameFile: async (projectId, fileId, newName) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fileService.renameFile(projectId, fileId, { newName });
      const renamedFile = response.data;
      set((state) => ({
        files: state.files.map((f) =>
          f.id === fileId ? renamedFile : f
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to rename file',
      });
      throw error;
    }
  },

  deleteFile: async (projectId, fileId) => {
    set({ isLoading: true, error: null });
    try {
      await fileService.deleteFile(projectId, fileId);
      set((state) => ({
        files: state.files.filter((f) => f.id !== fileId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to delete file',
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
