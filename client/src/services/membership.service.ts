/**
 * Membership service for frontend API integration.
 */

import api from './api';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * List members for a project.
 */
export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  const response = await api.get(`/api/v1/projects/${projectId}/members`);
  return response.data.data;
}

/**
 * Update a member's role.
 */
export async function updateMemberRole(
  projectId: string,
  memberId: string,
  role: 'editor' | 'viewer'
): Promise<ProjectMember> {
  const response = await api.patch(`/api/v1/projects/${projectId}/members/${memberId}`, { role });
  return response.data.data;
}

/**
 * Remove a member from a project.
 */
export async function removeMember(projectId: string, memberId: string): Promise<void> {
  await api.delete(`/api/v1/projects/${projectId}/members/${memberId}`);
}
