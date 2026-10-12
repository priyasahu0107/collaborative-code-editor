import { useEditorStore } from '../../stores/editorStore';
import { X } from 'lucide-react';

export default function EditorTabs() {
  const { openFiles, activeFileId, setActiveFile, closeFile } = useEditorStore();

  if (openFiles.length === 0) return null;

  return (
    <div className="flex border-b border-gray-200 bg-gray-50">
      {openFiles.map((file) => (
        <div
          key={file.id}
          className={`group flex items-center gap-2 border-r border-gray-200 px-4 py-2 text-sm ${
            file.id === activeFileId
              ? 'bg-white font-medium text-gray-900'
              : 'cursor-pointer text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveFile(file.id)}
        >
          <span>{file.name}</span>
          {file.isDirty && <span className="text-orange-600">●</span>}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeFile(file.id);
            }}
            className="rounded p-0.5 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
