/**
 * Chat panel component for project chat functionality.
 */

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { X, Send, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';

interface ChatPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ projectId, isOpen, onClose }: ChatPanelProps) {
  const { user } = useAuthStore();
  const {
    messages,
    isLoading,
    hasMore,
    isConnected,
    initializeSocket,
    joinRoom,
    leaveRoom,
    sendMessage,
    loadHistory,
  } = useChatStore();

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize socket and join room
  useEffect(() => {
    if (isOpen && projectId) {
      initializeSocket();
      joinRoom(projectId);
    }

    return () => {
      if (projectId) {
        leaveRoom();
      }
    };
  }, [isOpen, projectId, initializeSocket, joinRoom, leaveRoom]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadMore = () => {
    if (messages.length > 0) {
      const oldestMessage = messages[messages.length - 1];
      if (oldestMessage) {
        loadHistory(oldestMessage.id);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Project Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Connection status */}
      {!isConnected && (
        <div className="border-b border-gray-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
          Connecting to chat...
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No messages yet</p>
              <p className="text-xs text-gray-400">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="mb-3 text-center">
                <button
                  onClick={handleLoadMore}
                  className="text-xs text-blue-600 hover:text-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load older messages'}
                </button>
              </div>
            )}
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwnMessage = message.senderId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {!isOwnMessage && (
                        <div className="mb-1 text-xs font-medium opacity-75">
                          {message.senderEmail}
                        </div>
                      )}
                      <div className="text-sm">{message.content}</div>
                      <div className="mt-1 text-xs opacity-60">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            disabled={!isConnected || isSending}
            maxLength={2000}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newMessage.trim() || !isConnected || isSending}
            isLoading={isSending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
