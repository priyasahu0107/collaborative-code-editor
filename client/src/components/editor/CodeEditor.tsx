/**
 * Collaborative code editor component with Monaco and Yjs integration.
 */

import { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useEditorStore } from '../../stores/editorStore';
import { useCollaboration } from '../../hooks/useCollaboration';
import CollaborationStatus from '../collaboration/CollaborationStatus';
import ParticipantList from '../collaboration/ParticipantList';
import { Save, Wifi } from 'lucide-react';
import { Button } from '../ui/Button';
import * as collaborationService from '../../services/collaboration.service';

interface CodeEditorProps {
  projectId: string;
  fileId: string;
  fileName: string;
  language?: string;
  initialContent: string;
  version: number;
}

export default function CodeEditor({
  projectId,
  fileId,
  fileName,
  language = 'javascript',
  initialContent,
}: CodeEditorProps) {
  const { updateFileContent, saveFile, openFiles } = useEditorStore();
  const [content, setContent] = useState(initialContent);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const activeFile = openFiles.find((f) => f.id === fileId);
  const isDirty = activeFile?.isDirty || false;
  const isSaving = activeFile?.isSaving || false;

  // Collaboration hooks
  const {
    connectionStatus,
    currentRoomId,
    participants,
    manualSave,
  } = useCollaboration(projectId, fileId);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent, fileId]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      // Only update store if not in collaborative mode
      if (connectionStatus !== 'connected' || !currentRoomId) {
        updateFileContent(fileId, value);
      }
    }
  };

  const handleSave = async () => {
    try {
      if (connectionStatus === 'connected' && currentRoomId) {
        // Use collaborative save
        await manualSave();
      } else {
        // Use regular save
        await saveFile(projectId, fileId);
      }
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Add keyboard shortcut for save (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Bind to collaboration if connected
    if (connectionStatus === 'connected' && currentRoomId) {
      bindToCollaboration();
    }
  };

  // Bind editor to collaboration when room is joined
  useEffect(() => {
    if (editorRef.current && currentRoomId && connectionStatus === 'connected') {
      bindToCollaboration();
    }
  }, [currentRoomId, connectionStatus]);

  const bindToCollaboration = async () => {
    if (!editorRef.current || !currentRoomId) {
      return;
    }

    try {
      await collaborationService.bindEditor(
        currentRoomId,
        editorRef.current
      );
      console.log('Editor bound to collaboration');
    } catch (err) {
      console.error('Failed to bind editor to collaboration:', err);
    }
  };

  const isCollaborative = connectionStatus === 'connected' && currentRoomId !== null;

  return (
    <div className="flex h-full flex-col">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{fileName}</span>
          {isCollaborative && <CollaborationStatus />}
          {!isCollaborative && isDirty && (
            <span className="text-xs text-orange-600">● Unsaved</span>
          )}
          {isSaving && <span className="text-xs text-blue-600">Saving...</span>}
        </div>
        <div className="flex items-center gap-2">
          {isCollaborative && participants.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Wifi className="h-3 w-3" />
              <span>{participants.length} online</span>
            </div>
          )}
          <Button size="sm" onClick={handleSave} disabled={(!isDirty && !isCollaborative) || isSaving}>
            <Save className="mr-1 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 flex">
        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            value={content}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
            }}
          />
        </div>
        
        {/* Participant sidebar */}
        {isCollaborative && participants.length > 0 && (
          <div className="w-64 border-l border-gray-200 bg-gray-50 p-3 overflow-y-auto">
            <ParticipantList />
          </div>
        )}
      </div>
    </div>
  );
}
