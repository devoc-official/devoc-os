import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskDependencies } from '../features/shared/components/task-dependencies';
import { Task, TaskDependency } from '../api/projects.api';

describe('TaskDependencies Component (Section 32 Compliance)', () => {
  const currentTaskId = 'task-current';

  const mockTasks: Task[] = [
    {
      id: 'task-current',
      organizationId: 'org-1',
      projectId: 'proj-1',
      createdByPersonId: 'pers-1',
      taskKey: 'TSK-100',
      title: 'Implement Task Dependencies UI',
      taskType: 'feature',
      priority: 'high',
      status: 'in_progress',
      createdAt: '2026-09-15T00:00:00Z',
      updatedAt: '2026-09-15T00:00:00Z',
    },
    {
      id: 'task-blocker',
      organizationId: 'org-1',
      projectId: 'proj-1',
      createdByPersonId: 'pers-1',
      taskKey: 'TSK-099',
      title: 'Design API Endpoints for M4 Dependencies',
      taskType: 'feature',
      priority: 'critical',
      status: 'done',
      createdAt: '2026-09-14T00:00:00Z',
      updatedAt: '2026-09-15T00:00:00Z',
    },
    {
      id: 'task-downstream',
      organizationId: 'org-1',
      projectId: 'proj-1',
      createdByPersonId: 'pers-1',
      taskKey: 'TSK-101',
      title: 'Release Production Frontend v1.4',
      taskType: 'milestone',
      priority: 'critical',
      status: 'todo',
      createdAt: '2026-09-15T00:00:00Z',
      updatedAt: '2026-09-15T00:00:00Z',
    },
  ];

  const mockDependencies: TaskDependency[] = [
    {
      id: 'dep-1',
      organizationId: 'org-1',
      taskId: 'task-current',
      dependsOnTaskId: 'task-blocker',
      dependencyType: 'blocks',
      createdAt: '2026-09-15T01:00:00Z',
    },
    {
      id: 'dep-2',
      organizationId: 'org-1',
      taskId: 'task-downstream',
      dependsOnTaskId: 'task-current',
      dependencyType: 'blocks',
      createdAt: '2026-09-15T02:00:00Z',
    },
  ];

  it('renders blocked-by dependencies with visual badges', () => {
    render(
      <TaskDependencies
        currentTaskId={currentTaskId}
        dependencies={mockDependencies}
        allTasks={mockTasks}
        canManage={false}
      />
    );

    expect(screen.getByText('Task Dependencies & Blockers')).toBeInTheDocument();
    expect(screen.getByText('Design API Endpoints for M4 Dependencies')).toBeInTheDocument();
    expect(screen.getByText('TSK-099')).toBeInTheDocument();
  });

  it('allows adding a dependency when canManage is true', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDependencies
        currentTaskId={currentTaskId}
        dependencies={[]}
        allTasks={mockTasks}
        canManage={true}
        onAddDependency={onAdd}
      />
    );

    const select = screen.getByLabelText('Select blocker task');
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'task-blocker' } });

    const addButton = screen.getByText('Add Blocker');
    expect(addButton).not.toBeDisabled();
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('task-blocker');
    });
  });

  it('allows removing a dependency when canManage is true', async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDependencies
        currentTaskId={currentTaskId}
        dependencies={mockDependencies}
        allTasks={mockTasks}
        canManage={true}
        onRemoveDependency={onRemove}
      />
    );

    const deleteButtons = screen.getAllByLabelText('Remove Dependency');
    expect(deleteButtons.length).toBeGreaterThan(0);

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith('dep-1');
    });
  });
});
