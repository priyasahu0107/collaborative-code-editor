/**
 * Database Index Verification Script
 * 
 * This script ensures all required MongoDB indexes exist for optimal query performance.
 * Run this script during application startup or as a separate migration step.
 */

import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { getEnv } from '../config/env.js';

/**
 * Index definitions for all models
 */
const INDEX_DEFINITIONS = {
  users: [
    { key: { email: 1 }, options: { unique: true, name: 'users_email_unique' } },
    { key: { createdAt: -1 }, options: { name: 'users_createdAt_idx' } },
  ],
  projects: [
    { key: { ownerId: 1, createdAt: -1 }, options: { name: 'projects_ownerId_createdAt_idx' } },
    { key: { ownerId: 1, name: 1 }, options: { name: 'projects_ownerId_name_idx' } },
  ],
  files: [
    { key: { projectId: 1, path: 1 }, options: { unique: true, name: 'files_projectId_path_unique' } },
    { key: { projectId: 1, type: 1 }, options: { name: 'files_projectId_type_idx' } },
    { key: { ownerId: 1, projectId: 1 }, options: { name: 'files_ownerId_projectId_idx' } },
  ],
  projectMembers: [
    { key: { projectId: 1, userId: 1 }, options: { unique: true, name: 'projectMembers_projectId_userId_unique' } },
    { key: { userId: 1 }, options: { name: 'projectMembers_userId_idx' } },
  ],
  invitations: [
    { key: { projectId: 1, status: 1 }, options: { name: 'invitations_projectId_status_idx' } },
    { key: { inviteeEmail: 1, status: 1 }, options: { name: 'invitations_inviteeEmail_status_idx' } },
    { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'invitations_expiresAt_ttl' } },
  ],
  messages: [
    { key: { projectId: 1, createdAt: -1 }, options: { name: 'messages_projectId_createdAt_idx' } },
  ],
};

/**
 * Ensure all indexes exist for a collection
 */
async function ensureIndexesForCollection(
  collectionName: string,
  indexes: Array<{ key: Record<string, number>; options: mongoose.CreateIndexOptions }>
): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection(collectionName);
  
  for (const index of indexes) {
    try {
      // Check if index already exists
      const existingIndexes = await collection.indexes();
      const indexExists = existingIndexes.some(idx => {
        const idxKey = JSON.stringify(idx.key);
        const targetKey = JSON.stringify(index.key);
        return idxKey === targetKey;
      });

      if (!indexExists) {
        await collection.createIndex(index.key, index.options);
        logger.info(`Created index: ${index.options.name || 'unnamed'} on ${collectionName}`);
      } else {
        logger.debug(`Index already exists: ${index.options.name || 'unnamed'} on ${collectionName}`);
      }
    } catch (error) {
      logger.error(`Failed to create index on ${collectionName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        index: index.options.name,
      });
      throw error;
    }
  }
}

/**
 * Ensure all required indexes exist
 */
export async function ensureAllIndexes(): Promise<void> {
  const env = getEnv();
  
  // Skip index creation in test environment
  if (env.NODE_ENV === 'test') {
    logger.info('Skipping index creation in test environment');
    return;
  }

  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    logger.warn('Database not connected, skipping index creation');
    return;
  }

  logger.info('Starting database index verification...');

  try {
    for (const [collectionName, indexes] of Object.entries(INDEX_DEFINITIONS)) {
      await ensureIndexesForCollection(collectionName, indexes);
    }

    logger.info('Database index verification completed successfully');
  } catch (error) {
    logger.error('Database index verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get index statistics for monitoring
 */
export async function getIndexStats(): Promise<Record<string, any>> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const stats: Record<string, any> = {};

  for (const collectionName of Object.keys(INDEX_DEFINITIONS)) {
    try {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      const stats_data = await collection.stats();
      
      stats[collectionName] = {
        indexCount: indexes.length,
        indexes: indexes.map(idx => ({
          name: idx.name,
          key: idx.key,
          unique: idx.unique || false,
          size: stats_data.indexSizes[idx.name] || 0,
        })),
        totalIndexSize: Object.values(stats_data.indexSizes).reduce((sum: number, size: any) => sum + size, 0),
      };
    } catch (error) {
      stats[collectionName] = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return stats;
}

/**
 * Drop all non-required indexes (cleanup script)
 */
export async function cleanupUnusedIndexes(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  logger.warn('Starting index cleanup...');

  for (const [collectionName, requiredIndexes] of Object.entries(INDEX_DEFINITIONS)) {
    try {
      const collection = db.collection(collectionName);
      const existingIndexes = await collection.indexes();
      
      const requiredIndexNames = new Set(
        requiredIndexes.map(idx => idx.options.name).filter(Boolean)
      );
      requiredIndexNames.add('_id_'); // Always keep _id index

      for (const index of existingIndexes) {
        if (!requiredIndexNames.has(index.name)) {
          await collection.dropIndex(index.name);
          logger.info(`Dropped unused index: ${index.name} on ${collectionName}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to cleanup indexes on ${collectionName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info('Index cleanup completed');
}

export default {
  ensureAllIndexes,
  getIndexStats,
  cleanupUnusedIndexes,
};
