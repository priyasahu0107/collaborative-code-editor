/**
 * Collaboration store for managing real-time collaboration state.
 */

import { create } from 'zustand';
import * as collaborationService from '../services/collaboration.service';

interface CollaborationState {
  // Connection state
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  currentRoomId: string | null;
  
  // Participants
  participants: Array<{ socketId: string; userId: string; email: string }>;
  
  // Awareness
  awareness: Map<string, any>;
  
  // Actions
  initializeSocket: () => void;
  joinRoom: (projectId: string, fileId: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  sendAwareness: (awareness: any) => void;
  manualSave: () => Promise<boolean>;
}

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  connectionStatus: 'disconnected',
  currentRoomId: null,
  participants: [],
  awareness: new Map(),

  initializeSocket: () => {
    collaborationService.initializeSocket();
    
    // Subscribe to status changes
    collaborationService.onStatusChange((status) => {
      set({ connectionStatus: status });
    });

    // Subscribe to participant changes
    collaborationService.onParticipantsChange((participants) => {
      set({ participants });
    });

    // Subscribe to awareness changes
    collaborationService.onAwarenessChange((awareness) => {
      set({ awareness });
    });

    set({ connectionStatus: collaborationService.getConnectionStatus() });
  },

  joinRoom: async (projectId: string, fileId: string) => {
    const response = await collaborationService.joinRoom(projectId, fileId);
    if (response.success && response.roomId) {
      set({ 
        currentRoomId: response.roomId,
        participants: response.participants || [],
      });
      return true;
    }
    return false;
  },

  leaveRoom: async () => {
    const { currentRoomId } = get();
    if (currentRoomId) {
      await collaborationService.leaveRoom(currentRoomId);
      set({ 
        currentRoomId: null,
        participants: [],
        awareness: new Map(),
      });
    }
  },

  sendAwareness: (awareness: any) => {
    const { currentRoomId } = get();
    if (currentRoomId) {
      collaborationService.sendAwareness(currentRoomId, awareness);
    }
  },

  manualSave: async () => {
    const { currentRoomId } = get();
    if (currentRoomId) {
      return await collaborationService.manualSave(currentRoomId);
    }
    return false;
  },
}));
