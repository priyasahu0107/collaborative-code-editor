/**
 * Chat service for frontend Socket.IO chat integration.
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export interface ChatMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderEmail: string;
  content: string;
  createdAt: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

/**
 * Initialize Socket.IO connection for chat.
 */
export function initializeChatSocket(): Socket {
  if (socket) {
    return socket;
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  
  socket = io(socketUrl, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  return socket;
}

/**
 * Get the current socket instance.
 */
export function getChatSocket(): Socket | null {
  return socket;
}

/**
 * Join a chat room.
 */
export function joinChatRoom(projectId: string): Promise<{ success: boolean; chatRoomId?: string }> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ success: false });
      return;
    }

    socket.emit('chat:join', { projectId }, (response: any) => {
      resolve(response);
    });
  });
}

/**
 * Leave a chat room.
 */
export function leaveChatRoom(projectId: string): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ success: false });
      return;
    }

    socket.emit('chat:leave', { projectId }, (response: any) => {
      resolve(response);
    });
  });
}

/**
 * Send a chat message.
 */
export function sendChatMessage(projectId: string, content: string): Promise<{ success: boolean; message?: ChatMessage }> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ success: false });
      return;
    }

    socket.emit('chat:message', { projectId, content }, (response: any) => {
      resolve(response);
    });
  });
}

/**
 * Request chat message history.
 */
export function requestChatHistory(
  projectId: string,
  limit: number = 50,
  before?: string
): Promise<ChatHistoryResponse & { success: boolean }> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ success: false, messages: [], hasMore: false });
      return;
    }

    socket.emit('chat:history', { projectId, limit, before }, (response: any) => {
      resolve(response);
    });
  });
}

/**
 * Delete a chat message.
 */
export function deleteChatMessage(messageId: string): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ success: false });
      return;
    }

    socket.emit('chat:message:delete', { messageId }, (response: any) => {
      resolve(response);
    });
  });
}

/**
 * Disconnect chat socket.
 */
export function disconnectChatSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
