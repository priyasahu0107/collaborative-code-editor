/**
 * Collaboration service for client-side Socket.IO and Yjs integration.
 * 
 * Manages real-time collaboration connections and document synchronization.
 */

import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import type { editor } from 'monaco-editor';

// Socket.IO instance
let socket: Socket | null = null;

// Active Yjs documents by room ID
const activeDocuments = new Map<string, Y.Doc>();

// Active Monaco bindings by room ID
const activeBindings = new Map<string, MonacoBinding>();

// Connection status
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

// Event listeners
type StatusListener = (status: 'disconnected' | 'connecting' | 'connected') => void;
type ParticipantListener = (participants: Array<{ socketId: string; userId: string; email: string }>) => void;
type AwarenessListener = (awareness: Map<string, any>) => void;

const statusListeners = new Set<StatusListener>();
const participantListeners = new Set<ParticipantListener>();
const awarenessListeners = new Set<AwarenessListener>();

// Current room participants
let currentParticipants: Array<{ socketId: string; userId: string; email: string }> = [];

// Current awareness state
let currentAwareness = new Map<string, any>();

/**
 * Initialize Socket.IO connection.
 */
export function initializeSocket(): Socket {
  if (socket) {
    return socket;
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
  
  socket = io(socketUrl, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  // Connection event handlers
  socket.on('connect', () => {
    connectionStatus = 'connected';
    notifyStatusListeners();
    console.log('Socket connected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    if (connectionStatus !== 'connecting') {
      connectionStatus = 'connecting';
      notifyStatusListeners();
    }
  });

  socket.on('disconnect', (reason) => {
    connectionStatus = 'disconnected';
    notifyStatusListeners();
    console.log('Socket disconnected:', reason);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
  });

  // Room participant events
  socket.on('room:participant-joined', (data: { userId: string; email: string; socketId: string }) => {
    currentParticipants.push({
      socketId: data.socketId,
      userId: data.userId,
      email: data.email,
    });
    notifyParticipantListeners();
  });

  socket.on('room:participant-left', (data: { userId: string; socketId: string }) => {
    currentParticipants = currentParticipants.filter(p => p.socketId !== data.socketId);
    notifyParticipantListeners();
  });

  // Awareness events
  socket.on('collab:awareness', (data: { roomId: string; socketId: string; userId: string; awareness: any }) => {
    currentAwareness.set(data.socketId, {
      ...data.awareness,
      userId: data.userId,
      socketId: data.socketId,
    });
    notifyAwarenessListeners();
  });

  socket.on('collab:awareness-remove', (data: { roomId: string; socketId: string }) => {
    currentAwareness.delete(data.socketId);
    notifyAwarenessListeners();
  });

  return socket;
}

/**
 * Join a collaboration room.
 */
export async function joinRoom(
  projectId: string,
  fileId: string
): Promise<{ success: boolean; roomId?: string; participants?: any[]; error?: string }> {
  if (!socket) {
    initializeSocket();
  }

  return new Promise((resolve) => {
    socket!.emit('room:join', { projectId, fileId }, (response: any) => {
      if (response.success) {
        currentParticipants = response.participants || [];
        notifyParticipantListeners();
      }
      resolve(response);
    });
  });
}

/**
 * Leave a collaboration room.
 */
export async function leaveRoom(roomId: string): Promise<void> {
  if (!socket) return;

  return new Promise((resolve) => {
    socket!.emit('room:leave', { roomId }, () => {
      // Clean up document and binding
      cleanupRoom(roomId);
      resolve();
    });
  });
}

/**
 * Bind Monaco editor to Yjs document for a room.
 */
export async function bindEditor(
  roomId: string,
  editorInstance: editor.IStandaloneCodeEditor
): Promise<void> {
  if (!socket) {
    throw new Error('Socket not initialized');
  }

  // Get or create Yjs document
  let doc = activeDocuments.get(roomId);
  if (!doc) {
    doc = new Y.Doc();
    activeDocuments.set(roomId, doc);

    // Request initial state from server
    const stateResponse = await new Promise<any>((resolve) => {
      socket!.emit('collab:sync-request', { roomId }, resolve);
    });

    if (stateResponse.success && stateResponse.state) {
      const stateArray = new Uint8Array(stateResponse.state);
      Y.applyUpdate(doc, stateArray);
    }

    // Set up update handler
    doc.on('update', (update: Uint8Array, origin: any) => {
      // Only send updates that originated locally (not from remote)
      if (origin !== 'remote') {
        socket!.emit('collab:update', {
          roomId,
          update: Array.from(update),
        });
      }
    });

    // Listen for remote updates
    socket!.on('collab:update', (data: { roomId: string; update: number[]; userId: string }) => {
      if (data.roomId === roomId) {
        const updateArray = new Uint8Array(data.update);
        Y.applyUpdate(doc!, updateArray, 'remote');
      }
    });
  }

  // Get the Monaco model
  const model = editorInstance.getModel();
  if (!model) {
    throw new Error('Editor has no model');
  }

  // Create Yjs text type
  const ytext = doc.getText('content');

  // Create Monaco binding
  // Note: We pass undefined for awareness since we manage it via Socket.IO
  const binding = new MonacoBinding(
    ytext,
    model,
    new Set([editorInstance])
  );

  activeBindings.set(roomId, binding);
}

/**
 * Send awareness update.
 */
export function sendAwareness(roomId: string, awareness: any): void {
  if (!socket) return;

  socket.emit('collab:awareness', { roomId, awareness });
}

/**
 * Manually trigger save.
 */
export async function manualSave(roomId: string): Promise<boolean> {
  if (!socket) return false;

  return new Promise((resolve) => {
    socket!.emit('collab:save', { roomId }, (response: any) => {
      resolve(response.success);
    });
  });
}

/**
 * Clean up room resources.
 */
function cleanupRoom(roomId: string): void {
  // Destroy binding
  const binding = activeBindings.get(roomId);
  if (binding) {
    binding.destroy();
    activeBindings.delete(roomId);
  }

  // Destroy document
  const doc = activeDocuments.get(roomId);
  if (doc) {
    doc.destroy();
    activeDocuments.delete(roomId);
  }
}

/**
 * Disconnect socket.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Clean up all rooms
  for (const roomId of activeDocuments.keys()) {
    cleanupRoom(roomId);
  }

  currentParticipants = [];
  currentAwareness.clear();
  connectionStatus = 'disconnected';
  notifyStatusListeners();
}

/**
 * Get connection status.
 */
export function getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
  return connectionStatus;
}

/**
 * Get current participants.
 */
export function getParticipants(): Array<{ socketId: string; userId: string; email: string }> {
  return currentParticipants;
}

/**
 * Get current awareness state.
 */
export function getAwareness(): Map<string, any> {
  return currentAwareness;
}

/**
 * Subscribe to status changes.
 */
export function onStatusChange(listener: StatusListener): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

/**
 * Subscribe to participant changes.
 */
export function onParticipantsChange(listener: ParticipantListener): () => void {
  participantListeners.add(listener);
  return () => participantListeners.delete(listener);
}

/**
 * Subscribe to awareness changes.
 */
export function onAwarenessChange(listener: AwarenessListener): () => void {
  awarenessListeners.add(listener);
  return () => awarenessListeners.delete(listener);
}

/**
 * Notify status listeners.
 */
function notifyStatusListeners(): void {
  for (const listener of statusListeners) {
    listener(connectionStatus);
  }
}

/**
 * Notify participant listeners.
 */
function notifyParticipantListeners(): void {
  for (const listener of participantListeners) {
    listener(currentParticipants);
  }
}

/**
 * Notify awareness listeners.
 */
function notifyAwarenessListeners(): void {
  for (const listener of awarenessListeners) {
    listener(currentAwareness);
  }
}
