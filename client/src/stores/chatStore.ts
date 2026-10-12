/**
 * Chat store for managing chat state.
 */

import { create } from 'zustand';
import * as chatService from '../services/chat.service';

interface ChatState {
  messages: chatService.ChatMessage[];
  isLoading: boolean;
  hasMore: boolean;
  isConnected: boolean;
  currentProjectId: string | null;

  // Actions
  initializeSocket: () => void;
  joinRoom: (projectId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadHistory: (before?: string) => Promise<void>;
  addMessage: (message: chatService.ChatMessage) => void;
  removeMessage: (messageId: string) => void;
  setConnected: (connected: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  hasMore: false,
  isConnected: false,
  currentProjectId: null,

  initializeSocket: () => {
    const socket = chatService.initializeChatSocket();
    
    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('chat:message:new', (message: chatService.ChatMessage) => {
      get().addMessage(message);
    });

    socket.on('chat:message:deleted', ({ messageId }: { messageId: string }) => {
      get().removeMessage(messageId);
    });
  },

  joinRoom: async (projectId: string) => {
    const socket = chatService.getChatSocket();
    if (!socket) {
      get().initializeSocket();
    }

    const response = await chatService.joinChatRoom(projectId);
    if (response.success) {
      set({ currentProjectId: projectId });
      await get().loadHistory();
    }
  },

  leaveRoom: async () => {
    const { currentProjectId } = get();
    if (currentProjectId) {
      await chatService.leaveChatRoom(currentProjectId);
      set({ currentProjectId: null, messages: [], hasMore: false });
    }
  },

  sendMessage: async (content: string) => {
    const { currentProjectId } = get();
    if (!currentProjectId) return;

    const response = await chatService.sendChatMessage(currentProjectId, content);
    if (!response.success) {
      throw new Error('Failed to send message');
    }
  },

  loadHistory: async (before?: string) => {
    const { currentProjectId } = get();
    if (!currentProjectId) return;

    set({ isLoading: true });
    try {
      const response = await chatService.requestChatHistory(currentProjectId, 50, before);
      if (response.success) {
        if (before) {
          // Append older messages
          set((state) => ({
            messages: [...state.messages, ...response.messages],
            hasMore: response.hasMore,
          }));
        } else {
          // Replace with latest messages
          set({
            messages: response.messages,
            hasMore: response.hasMore,
          });
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },

  addMessage: (message: chatService.ChatMessage) => {
    set((state) => ({
      messages: [message, ...state.messages],
    }));
  },

  removeMessage: (messageId: string) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }));
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  clearMessages: () => {
    set({ messages: [], hasMore: false });
  },
}));
