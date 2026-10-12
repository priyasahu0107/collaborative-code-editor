/**
 * Collaboration service for managing Yjs documents and persistence.
 * 
 * Handles document creation, synchronization, and MongoDB persistence.
 */

import * as Y from 'yjs';
import { Types } from 'mongoose';
import File from '../models/File.model.js';
import logger from '../utils/logger.js';

// Store active Yjs documents by room ID
const activeDocuments = new Map<string, Y.Doc>();

// Store persistence timeouts for debouncing
const persistenceTimeouts = new Map<string, NodeJS.Timeout>();

// Persistence debounce delay (ms)
const PERSISTENCE_DEBOUNCE_DELAY = 2000;

/**
 * Get or create a Yjs document for a file.
 */
export async function getOrCreateDocument(
  projectId: string,
  fileId: string
): Promise<Y.Doc> {
  const roomId = `${projectId}:${fileId}`;
  
  // Return existing document if available
  if (activeDocuments.has(roomId)) {
    return activeDocuments.get(roomId)!;
  }

  // Create new document
  const doc = new Y.Doc();

  // Load initial content from database
  try {
    const file = await File.findById(fileId);
    if (file && file.content) {
      const ytext = doc.getText('content');
      ytext.insert(0, file.content);
      logger.info('Loaded initial content from database', { roomId, length: file.content.length });
    }
  } catch (error) {
    logger.error('Failed to load initial content', { roomId, error });
  }

  // Set up persistence observer
  setupPersistenceObserver(doc, roomId, projectId, fileId);

  // Store document
  activeDocuments.set(roomId, doc);
  logger.info('Created new Yjs document', { roomId });

  return doc;
}

/**
 * Set up persistence observer for a document.
 */
function setupPersistenceObserver(
  doc: Y.Doc,
  roomId: string,
  projectId: string,
  fileId: string
): void {
  // Listen for updates
  doc.on('update', () => {
    schedulePersistence(roomId, projectId, fileId, doc);
  });
}

/**
 * Schedule debounced persistence.
 */
function schedulePersistence(
  roomId: string,
  projectId: string,
  fileId: string,
  doc: Y.Doc
): void {
  // Clear existing timeout
  const existingTimeout = persistenceTimeouts.get(roomId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Schedule new persistence
  const timeout = setTimeout(async () => {
    await persistDocument(roomId, projectId, fileId, doc);
    persistenceTimeouts.delete(roomId);
  }, PERSISTENCE_DEBOUNCE_DELAY);

  persistenceTimeouts.set(roomId, timeout);
}

/**
 * Persist document content to database.
 */
async function persistDocument(
  roomId: string,
  projectId: string,
  fileId: string,
  doc: Y.Doc
): Promise<void> {
  try {
    const ytext = doc.getText('content');
    const content = ytext.toString();

    // Find current file to get version
    const file = await File.findById(fileId);
    if (!file) {
      logger.warn('File not found for persistence', { roomId, fileId });
      return;
    }

    // Update file with new content and increment version
    await File.findByIdAndUpdate(fileId, {
      content,
      version: file.version + 1,
      updatedAt: new Date(),
    });

    logger.info('Persisted document to database', { 
      roomId, 
      fileId, 
      version: file.version + 1,
      contentLength: content.length 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to persist document', { roomId, error: message });
  }
}

/**
 * Flush pending persistence for a document.
 */
export async function flushDocument(roomId: string): Promise<void> {
  const timeout = persistenceTimeouts.get(roomId);
  if (timeout) {
    clearTimeout(timeout);
    persistenceTimeouts.delete(roomId);
    
    const doc = activeDocuments.get(roomId);
    if (doc) {
      const [projectId, fileId] = roomId.split(':');
      if (projectId && fileId) {
        await persistDocument(roomId, projectId, fileId, doc);
      }
    }
  }
}

/**
 * Clean up document when no longer needed.
 */
export async function cleanupDocument(roomId: string): Promise<void> {
  // Flush any pending persistence
  await flushDocument(roomId);

  // Get document
  const doc = activeDocuments.get(roomId);
  if (doc) {
    // Destroy document
    doc.destroy();
    activeDocuments.delete(roomId);
    logger.info('Cleaned up Yjs document', { roomId });
  }
}

/**
 * Get document state as binary update.
 */
export function getDocumentState(roomId: string): Uint8Array | null {
  const doc = activeDocuments.get(roomId);
  if (!doc) {
    return null;
  }
  return Y.encodeStateAsUpdate(doc);
}

/**
 * Apply binary update to document.
 */
export function applyUpdate(roomId: string, update: Uint8Array): boolean {
  const doc = activeDocuments.get(roomId);
  if (!doc) {
    return false;
  }

  try {
    Y.applyUpdate(doc, update);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to apply update', { roomId, error: message });
    return false;
  }
}

/**
 * Get all active room IDs.
 */
export function getActiveRooms(): string[] {
  return Array.from(activeDocuments.keys());
}

/**
 * Check if a room has an active document.
 */
export function hasActiveDocument(roomId: string): boolean {
  return activeDocuments.has(roomId);
}
