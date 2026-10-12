/**
 * React hook for collaboration functionality.
 */

import { useEffect, useRef } from 'react';
import { useCollaborationStore } from '../stores/collaborationStore';
import * as collaborationService from '../services/collaboration.service';
import type { editor } from 'monaco-editor';

/**
 * Hook for managing collaboration in a component.
 */
export function useCollaboration(projectId: string | undefined, fileId: string | undefined) {
  const {
    connectionStatus,
    currentRoomId,
    participants,
    awareness,
    initializeSocket,
    joinRoom,
    leaveRoom,
    sendAwareness,
    manualSave,
  } = useCollaborationStore();

  // Initialize socket on mount
  useEffect(() => {
    initializeSocket();
    
    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, [initializeSocket]);

  // Join room when projectId and fileId are available
  useEffect(() => {
    if (projectId && fileId && !currentRoomId) {
      joinRoom(projectId, fileId);
    }

    return () => {
      // Leave room on unmount
      if (currentRoomId) {
        leaveRoom();
      }
    };
  }, [projectId, fileId, currentRoomId, joinRoom, leaveRoom]);

  return {
    connectionStatus,
    currentRoomId,
    participants,
    awareness,
    sendAwareness,
    manualSave,
  };
}

/**
 * Hook for binding Monaco editor to collaboration.
 */
export function useCollaborativeEditor(
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>,
  roomId: string | null
) {
  const bindingRef = useRef<any>(null);

  useEffect(() => {
    if (!editorRef.current || !roomId) {
      return;
    }

    // Bind editor to collaboration
    collaborationService.bindEditor(roomId, editorRef.current);

    return () => {
      // Cleanup is handled by the collaboration service
    };
  }, [editorRef, roomId]);

  return bindingRef;
}
