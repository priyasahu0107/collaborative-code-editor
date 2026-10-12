/**
 * Collaboration status indicator component.
 */

import { Wifi, WifiOff, Loader } from 'lucide-react';
import { useCollaborationStore } from '../../stores/collaborationStore';

export default function CollaborationStatus() {
  const { connectionStatus, participants } = useCollaborationStore();

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          text: 'Connected',
          bgColor: 'bg-green-50',
        };
      case 'connecting':
        return {
          icon: Loader,
          color: 'text-yellow-500',
          text: 'Connecting...',
          bgColor: 'bg-yellow-50',
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          text: 'Disconnected',
          bgColor: 'bg-red-50',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusInfo.bgColor}`}>
      <Icon className={`h-4 w-4 ${statusInfo.color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
      <span className={`text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
      {connectionStatus === 'connected' && participants.length > 0 && (
        <span className="text-xs text-gray-600">
          ({participants.length} {participants.length === 1 ? 'user' : 'users'})
        </span>
      )}
    </div>
  );
}
