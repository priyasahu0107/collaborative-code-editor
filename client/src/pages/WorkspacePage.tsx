import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useFileStore } from '../stores/fileStore';
import { useEditorStore } from '../stores/editorStore';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import FileExplorer from '../components/editor/FileExplorer';
import CodeEditor from '../components/editor/CodeEditor';
import EditorTabs from '../components/editor/EditorTabs';
import ChatPanel from '../components/chat/ChatPanel';
import InviteCollaboratorDialog from '../components/collaboration/InviteCollaboratorDialog';
import ExecutionOutputPanel from '../components/execution/ExecutionOutputPanel';
import { MessageSquare, Users, Play } from 'lucide-react';

export default function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, fetchProject, isLoading: projectLoading, error: projectError } = useProjectStore();
  const { fetchFiles } = useFileStore();
  const { openFiles, activeFileId } = useEditorStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [executionOpen, setExecutionOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      fetchFiles(projectId, { recursive: true });
    }
  }, [projectId, fetchProject, fetchFiles]);

  if (projectLoading && !currentProject) {
    return <LoadingState />;
  }

  if (projectError) {
    return <ErrorState message={projectError} />;
  }

  if (!currentProject) {
    return <ErrorState message="Project not found" />;
  }

  const activeFile = openFiles.find((f) => f.id === activeFileId);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r border-gray-200 bg-white">
          <FileExplorer projectId={projectId!} />
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded p-1 hover:bg-gray-100"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
            <span className="ml-2 text-sm font-medium text-gray-700">{currentProject.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInviteDialogOpen(true)}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              title="Invite Collaborator"
            >
              <Users className="h-4 w-4" />
              <span>Invite</span>
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ${
                chatOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Toggle Chat"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setExecutionOpen(!executionOpen)}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ${
                executionOpen ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Toggle Execution Panel"
            >
              <Play className="h-4 w-4" />
              <span>Run</span>
            </button>
          </div>
        </div>

        {/* Editor Tabs */}
        {openFiles.length > 0 && <EditorTabs />}

        {/* Editor */}
        <div className="flex-1">
          {activeFile ? (
            <CodeEditor
              projectId={projectId!}
              fileId={activeFile.id}
              fileName={activeFile.name}
              language={activeFile.language}
              initialContent={activeFile.content}
              version={activeFile.version}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-50">
              <div className="text-center">
                <p className="text-lg text-gray-500">Select a file to start editing</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      {chatOpen && projectId && (
        <div className="w-80">
          <ChatPanel
            projectId={projectId}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        </div>
      )}

      {/* Invite Dialog */}
      {projectId && (
        <InviteCollaboratorDialog
          projectId={projectId}
          isOpen={inviteDialogOpen}
          onClose={() => setInviteDialogOpen(false)}
        />
      )}

      {/* Execution Output Panel */}
      {executionOpen && projectId && activeFile && (
        <div className="h-64 border-t border-gray-200">
          <ExecutionOutputPanel
            isOpen={executionOpen}
            onClose={() => setExecutionOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
