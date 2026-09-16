'use client';

import React, { useState } from 'react';
import { usePMTasks } from '../hooks/use-pm-tasks';
import { TaskTable } from '../../shared/components/task-table';
import { TaskDetailDialog } from '../../shared/components/task-detail-dialog';
import { Task, TaskDependency, TaskPriority, TaskStatus } from '../../../api/projects.api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogFooter } from '../../../components/ui/dialog';
import { Plus, ListTodo } from 'lucide-react';

export function PMTasksView() {
  const {
    tasks,
    projects,
    isLoading,
    createTask,
    transitionStatus,
    getDependencies,
    addDependency,
    removeDependency,
  } = usePMTasks();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDependencies, setTaskDependencies] = useState<TaskDependency[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('feature');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTaskClick = async (t: Task) => {
    setSelectedTask(t);
    const deps = await getDependencies(t.id);
    setTaskDependencies(deps);
  };

  const handleCreate = async () => {
    const projId = selectedProjectId || projects[0]?.id;
    if (!title.trim() || !projId) return;
    setIsSubmitting(true);
    try {
      await createTask({
        projectId: projId,
        title: title.trim(),
        taskType,
        priority,
        description: description.trim() || undefined,
        dueAt: dueAt || undefined,
      });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      setDueAt('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentProject = projects.find((p) => p.id === selectedTask?.projectId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-devoc-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Task Governance
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Operational task management: assign priorities, transition workflows, and visualize blockers.
          </p>
        </div>

        {projects.length > 0 && (
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-8 text-xs font-medium">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create Task
          </Button>
        )}
      </div>

      <TaskTable
        tasks={tasks}
        projects={projects}
        isLoading={isLoading}
        onTaskClick={handleTaskClick}
      />

      {/* Task Detail Dialog with Dependency Management */}
      <TaskDetailDialog
        task={selectedTask}
        project={currentProject}
        dependencies={taskDependencies}
        allTasks={tasks}
        canManage={true}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onStatusChange={async (taskId, status) => {
          await transitionStatus(taskId, status);
          if (selectedTask?.id === taskId) {
            setSelectedTask((prev) => (prev ? { ...prev, status } : null));
          }
        }}
        onAddDependency={async (taskId, dependsOnId) => {
          await addDependency(taskId, dependsOnId);
          const updated = await getDependencies(taskId);
          setTaskDependencies(updated);
        }}
        onRemoveDependency={async (taskId, depId) => {
          await removeDependency(taskId, depId);
          const updated = await getDependencies(taskId);
          setTaskDependencies(updated);
        }}
      />

      {/* Create Task Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Task"
        description="Define a new technical deliverable or operational requirement."
        maxWidth="md"
      >
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Target Project <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedProjectId || projects[0]?.id}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement multi-tenant schema verification"
              className="h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-devoc-text-primary block">Type</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="task">Task</option>
                <option value="milestone">Milestone</option>
                <option value="research">Research</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-devoc-text-primary block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">Due Date</label>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details..."
              className="w-full p-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent resize-none"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen(false)}
            disabled={isSubmitting}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={isSubmitting || !title.trim()}
            className="text-xs h-8"
          >
            Create Task
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
