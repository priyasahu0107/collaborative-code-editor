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

export default function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, fetchProject, isLoading: projectLoading, error: projectError } = useProjectStore();
  const { fetchFiles } = useFileStore();
  const { openFiles, activeFileId } = useEditorStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
        <div className="flex h-12 items-center border-b border-gray-200 bg-white px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1 hover:bg-gray-100"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <span className="ml-4 text-sm font-medium text-gray-700">{currentProject.name}</span>
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
    </div>
  );
}
