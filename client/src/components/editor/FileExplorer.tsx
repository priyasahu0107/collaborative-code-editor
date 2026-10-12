import { useFileStore } from '../../stores/fileStore';
import { useEditorStore } from '../../stores/editorStore';
import { File, Folder, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';

interface FileExplorerProps {
  projectId: string;
}

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileItem[];
}

export default function FileExplorer({ projectId }: FileExplorerProps) {
  const { files, isLoading, createFile } = useFileStore();
  const { openFile } = useEditorStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build file tree structure
  const buildFileTree = (): FileItem[] => {
    const tree: FileItem[] = [];
    const folderMap = new Map<string, FileItem>();

    // Sort files by path to ensure folders are created before their contents
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    for (const file of sortedFiles) {
      const pathParts = file.path.split('/');
      const fileName = pathParts[pathParts.length - 1] || '';
      const parentPath = pathParts.slice(0, -1).join('/');

      const item: FileItem = {
        id: file.id,
        name: fileName,
        path: file.path,
        type: file.type,
        children: file.type === 'folder' ? [] : undefined,
      };

      if (parentPath === '') {
        // Root level
        tree.push(item);
      } else {
        // Nested - find parent
        const parent = folderMap.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(item);
        }
      }

      if (file.type === 'folder') {
        folderMap.set(file.path, item);
      }
    }

    return tree;
  };

  const fileTree = buildFileTree();

  const handleFileClick = async (file: FileItem) => {
    if (file.type === 'folder') {
      // Toggle folder expansion
      const newExpanded = new Set(expandedFolders);
      if (newExpanded.has(file.id)) {
        newExpanded.delete(file.id);
      } else {
        newExpanded.add(file.id);
      }
      setExpandedFolders(newExpanded);
    } else {
      // Open file in editor
      try {
        await openFile(projectId, file.id, file.name, file.path);
      } catch (err) {
        console.error('Failed to open file:', err);
      }
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    try {
      await createFile(projectId, {
        name: newFileName,
        type: newFileType,
      });
      setIsCreateModalOpen(false);
      setNewFileName('');
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  const renderFileItem = (item: FileItem, depth: number = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <div
          onClick={() => handleFileClick(item)}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-100"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {item.type === 'folder' ? (
            <>
              <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
              <Folder className="h-4 w-4 text-blue-500" />
            </>
          ) : (
            <>
              <span className="w-3"></span>
              <File className="h-4 w-4 text-gray-500" />
            </>
          )}
          <span className="text-sm text-gray-700">{item.name}</span>
        </div>
        {item.type === 'folder' && isExpanded && hasChildren && (
          <div>{item.children!.map((child) => renderFileItem(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading files...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Files</h3>
        <Button size="sm" variant="ghost" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">No files yet</div>
        ) : (
          fileTree.map((item) => renderFileItem(item))
        )}
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New File"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={newFileType === 'file' ? 'primary' : 'outline'}
              onClick={() => setNewFileType('file')}
            >
              File
            </Button>
            <Button
              variant={newFileType === 'folder' ? 'primary' : 'outline'}
              onClick={() => setNewFileType('folder')}
            >
              Folder
            </Button>
          </div>
          <Input
            label="Name"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder={newFileType === 'file' ? 'index.js' : 'src'}
            required
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFile} disabled={!newFileName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
