'use client';

import React, { useState } from 'react';
import { useEmployeeTasks } from '../hooks/use-employee-tasks';
import { TaskTable } from '../../shared/components/task-table';
import { TaskDetailDialog } from '../../shared/components/task-detail-dialog';
import { Task, TaskDependency, TaskStatus } from '../../../api/projects.api';

export function EmployeeTasksView() {
  const { tasks, projects, isLoading, transitionStatus, loadDependencies } = useEmployeeTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);

  const handleTaskClick = async (task: Task) => {
    setSelectedTask(task);
    const deps = await loadDependencies(task.id);
    setDependencies(deps);
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await transitionStatus(taskId, status);
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const currentProject = projects.find((p) => p.id === selectedTask?.projectId) || null;

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          My Tasks
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Operational task ledger: monitor sprint items, blockers, priority levels, and transition task statuses.
        </p>
      </div>

      <TaskTable
        tasks={tasks}
        projects={projects}
        isLoading={isLoading}
        onTaskClick={handleTaskClick}
      />

      <TaskDetailDialog
        task={selectedTask}
        project={currentProject}
        dependencies={dependencies}
        allTasks={tasks}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
