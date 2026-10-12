/**
 * Invitation service for frontend API integration.
 */

import api from './api';

export interface Invitation {
  id: string;
  projectId: string;
  inviterId: string;
  inviteeEmail: string;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingInvitation extends Invitation {
  project?: {
    id: string;
    name: string;
  };
  inviter?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateInvitationRequest {
  email: string;
  role: 'editor' | 'viewer';
}

export interface CreateInvitationResponse {
  invitation: Invitation;
  token: string;
}

/**
 * Create a new invitation.
 */
export async function createInvitation(
  projectId: string,
  data: CreateInvitationRequest
): Promise<CreateInvitationResponse> {
  const response = await api.post(`/api/v1/projects/${projectId}/invitations`, data);
  return response.data.data;
}

/**
 * List invitations for a project.
 */
export async function listInvitations(projectId: string): Promise<Invitation[]> {
  const response = await api.get(`/api/v1/projects/${projectId}/invitations`);
  return response.data.data;
}

/**
 * List pending invitations for the current user.
 */
export async function listPendingInvitations(): Promise<PendingInvitation[]> {
  const response = await api.get('/api/v1/invitations/pending');
  return response.data.data;
}

/**
 * Accept an invitation.
 */
export async function acceptInvitation(invitationId: string, token: string): Promise<any> {
  const response = await api.post(`/api/v1/invitations/${invitationId}/accept`, { token });
  return response.data.data;
}

/**
 * Decline an invitation.
 */
export async function declineInvitation(invitationId: string, token: string): Promise<void> {
  await api.post(`/api/v1/invitations/${invitationId}/decline`, { token });
}

/**
 * Revoke an invitation.
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  await api.post(`/api/v1/invitations/${invitationId}/revoke`);
}
