/**
 * Invite collaborator dialog component.
 */

import { useState } from 'react';
import { createInvitation } from '../../services/invitation.service';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import { UserPlus } from 'lucide-react';

interface InviteCollaboratorDialogProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InviteCollaboratorDialog({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: InviteCollaboratorDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setInvitationToken(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createInvitation(projectId, { email: email.trim(), role });
      setInvitationToken(result.token);
      setSuccessMessage(`Invitation sent to ${email}`);
      setEmail('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('editor');
    setError(null);
    setSuccessMessage(null);
    setInvitationToken(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite Collaborator">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {successMessage && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
            <div>{successMessage}</div>
            {invitationToken && (
              <div className="mt-2">
                <div className="text-xs font-medium">Invitation Token (share with invitee):</div>
                <div className="mt-1 rounded bg-gray-100 p-2 font-mono text-xs break-all">
                  {invitationToken}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  Note: This token will only be shown once. Share it securely with the invitee.
                </div>
              </div>
            )}
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborator@example.com"
          required
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole('editor')}
              className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                role === 'editor'
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setRole('viewer')}
              className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                role === 'viewer'
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Viewer
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {role === 'editor'
              ? 'Can view and edit files'
              : 'Can view files and chat, but cannot edit'}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={!email.trim()}>
            <UserPlus className="mr-2 h-4 w-4" />
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
