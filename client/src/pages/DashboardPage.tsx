import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { Button } from '../components/ui/Button';
import { Plus, FolderOpen } from 'lucide-react';
import LoadingState from '../components/common/LoadingState';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { projects, isLoading, fetchProjects, createProject } = useProjectStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const project = await createProject({
        name: newProjectName,
        description: newProjectDesc || undefined,
      });
      setIsCreateModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      navigate(`/workspace/${project.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  if (isLoading && projects.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Manage your projects</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12">
          <FolderOpen className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="mt-2 text-sm text-gray-600">Get started by creating a new project</p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/workspace/${project.id}`)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
              {project.description && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{project.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>{project.fileCount} files</span>
                <span>{project.defaultLanguage}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="My Awesome Project"
            required
          />
          <Input
            label="Description (optional)"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            placeholder="A brief description..."
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
