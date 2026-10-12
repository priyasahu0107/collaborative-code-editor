/**
 * Participant list component showing active collaborators.
 */

import { Users } from 'lucide-react';
import { useCollaborationStore } from '../../stores/collaborationStore';

export default function ParticipantList() {
  const { participants, connectionStatus } = useCollaborationStore();

  if (connectionStatus !== 'connected' || participants.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">Active Collaborators</h3>
      </div>
      <div className="space-y-1">
        {participants.map((participant) => (
          <div
            key={participant.socketId}
            className="flex items-center gap-2 text-sm text-gray-700"
          >
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>{participant.email}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
