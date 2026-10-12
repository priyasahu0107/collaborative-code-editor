import { create } from 'zustand';
import { OpenFile } from '../types';
import { fileService } from '../services/file.service';

interface EditorState {
  openFiles: OpenFile[];
  activeFileId: string | null;
  isSaving: boolean;
  error: string | null;

  // Actions
  openFile: (projectId: string, fileId: string, fileName: string, filePath: string, language?: string) => Promise<void>;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  saveFile: (projectId: string, fileId: string) => Promise<void>;
  clearError: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: [],
  activeFileId: null,
  isSaving: false,
  error: null,

  openFile: async (projectId, fileId, fileName, filePath, language) => {
    const { openFiles } = get();
    
    // Check if file is already open
    const existingFile = openFiles.find((f) => f.id === fileId);
    if (existingFile) {
      set({ activeFileId: fileId });
      return;
    }

    // Fetch file content
    try {
      set({ error: null });
      const response = await fileService.getFile(projectId, fileId);
      const fileData = response.data;
      
      const newFile: OpenFile = {
        id: fileData.id,
        name: fileName,
        path: filePath,
        language: language || fileData.language,
        content: fileData.content || '',
        version: fileData.version,
        isDirty: false,
        isSaving: false,
      };

      set((state) => ({
        openFiles: [...state.openFiles, newFile],
        activeFileId: fileId,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to open file' });
      throw error;
    }
  },

  closeFile: (fileId: string) => {
    const { openFiles, activeFileId } = get();
    const fileIndex = openFiles.findIndex((f) => f.id === fileId);
    
    if (fileIndex === -1) return;

    const newOpenFiles = openFiles.filter((f) => f.id !== fileId);
    
    // If closing the active file, switch to another
    let newActiveFileId = activeFileId;
    if (activeFileId === fileId) {
      if (newOpenFiles.length > 0) {
        // Switch to the previous file or the first one
        newActiveFileId = newOpenFiles[Math.max(0, fileIndex - 1)]?.id || null;
      } else {
        newActiveFileId = null;
      }
    }

    set({
      openFiles: newOpenFiles,
      activeFileId: newActiveFileId,
    });
  },

  setActiveFile: (fileId: string) => {
    set({ activeFileId: fileId });
  },

  updateFileContent: (fileId: string, content: string) => {
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.id === fileId
          ? { ...f, content, isDirty: true }
          : f
      ),
    }));
  },

  saveFile: async (projectId: string, fileId: string) => {
    const { openFiles } = get();
    const file = openFiles.find((f) => f.id === fileId);
    
    if (!file || !file.isDirty) return;

    set((state) => ({
      isSaving: true,
      openFiles: state.openFiles.map((f) =>
        f.id === fileId ? { ...f, isSaving: true } : f
      ),
      error: null,
    }));

    try {
      const response = await fileService.updateFile(projectId, fileId, {
        content: file.content,
        version: file.version,
      });

      const updatedFile = response.data;

      set((state) => ({
        isSaving: false,
        openFiles: state.openFiles.map((f) =>
          f.id === fileId
            ? {
                ...f,
                version: updatedFile.version,
                isDirty: false,
                isSaving: false,
              }
            : f
        ),
      }));
    } catch (error: any) {
      set((state) => ({
        isSaving: false,
        error: error.message || 'Failed to save file',
        openFiles: state.openFiles.map((f) =>
          f.id === fileId ? { ...f, isSaving: false } : f
        ),
      }));
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
