import { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useEditorStore } from '../../stores/editorStore';
import { Save } from 'lucide-react';
import { Button } from '../ui/Button';

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
  const activeFile = openFiles.find((f) => f.id === fileId);
  const isDirty = activeFile?.isDirty || false;
  const isSaving = activeFile?.isSaving || false;

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent, fileId]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      updateFileContent(fileId, value);
    }
  };

  const handleSave = async () => {
    try {
      await saveFile(projectId, fileId);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add keyboard shortcut for save (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{fileName}</span>
          {isDirty && <span className="text-xs text-orange-600">● Unsaved</span>}
          {isSaving && <span className="text-xs text-blue-600">Saving...</span>}
        </div>
        <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
          <Save className="mr-1 h-4 w-4" />
          Save
        </Button>
      </div>

      {/* Monaco Editor */}
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
    </div>
  );
}
