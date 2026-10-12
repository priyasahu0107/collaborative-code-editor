/**
 * Execution store for managing code execution state
 */

import { create } from 'zustand';
import { ExecutionResult, Language, executeCode, getSupportedLanguages } from '../services/execution.service';

interface ExecutionState {
  // State
  isExecuting: boolean;
  result: ExecutionResult | null;
  error: string | null;
  languages: Language[];
  selectedLanguage: string;
  
  // Actions
  execute: (projectId: string, fileId: string | undefined, language: string, code: string, stdin?: string) => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
  loadLanguages: () => Promise<void>;
  setSelectedLanguage: (language: string) => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  // Initial state
  isExecuting: false,
  result: null,
  error: null,
  languages: [],
  selectedLanguage: 'javascript',
  
  // Execute code
  execute: async (projectId, fileId, language, code, stdin) => {
    set({ isExecuting: true, error: null, result: null });
    
    try {
      const result = await executeCode({
        projectId,
        fileId,
        language,
        code,
        stdin,
      });
      
      set({ result, isExecuting: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      set({ error: errorMessage, isExecuting: false });
    }
  },
  
  // Clear result
  clearResult: () => set({ result: null }),
  
  // Clear error
  clearError: () => set({ error: null }),
  
  // Load supported languages
  loadLanguages: async () => {
    try {
      const languages = await getSupportedLanguages();
      set({ languages });
    } catch (error) {
      console.error('Failed to load languages:', error);
    }
  },
  
  // Set selected language
  setSelectedLanguage: (language) => set({ selectedLanguage: language }),
}));
