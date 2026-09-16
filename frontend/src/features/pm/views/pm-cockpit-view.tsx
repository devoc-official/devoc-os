'use client';

import React, { useState } from 'react';
import { usePMCockpit } from '../hooks/use-pm-cockpit';
import { TaskTable } from '../../shared/components/task-table';
import { TaskDetailDialog } from '../../shared/components/task-detail-dialog';
import { WorkTable } from '../../shared/components/work-table';
import { Task, TaskDependency, TaskPriority, TaskStatus } from '../../../api/projects.api';
import { StatusBadge } from '../../../components/data/status-badge';
import { Tabs, TabList, TabTrigger, TabContent } from '../../../components/ui/tabs';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogFooter } from '../../../components/ui/dialog';
import {
  FolderGit2,
  ListTodo,
  Users,
  Clock,
  Plus,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  Calendar,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export interface PMCockpitViewProps {
  projectId: string;
}

export function PMCockpitView({ projectId }: PMCockpitViewProps) {
  const {
    project,
    tasks,
    assignments,
    workRecords,
    people,
    completedTasksCount,
    blockedTasksCount,
    progressPercent,
    isLoading,
    createTask,
    transitionTaskStatus,
    getDependencies,
    addDependency,
    removeDependency,
    assignPerson,
  } = usePMCockpit(projectId);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDependencies, setTaskDependencies] = useState<TaskDependency[]>([]);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState('feature');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Assign member modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [roleContext, setRoleContext] = useState('Backend Developer');
  const [capacityValue, setCapacityValue] = useState<number>(20);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const handleTaskClick = async (task: Task) => {
    setSelectedTask(task);
    const deps = await getDependencies(task.id);
    setTaskDependencies(deps);
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setIsSubmittingTask(true);
    try {
      await createTask({
        title: newTaskTitle.trim(),
        taskType: newTaskType,
        priority: newTaskPriority,
        description: newTaskDesc.trim() || undefined,
        dueAt: newTaskDue || undefined,
      });
      setIsCreateTaskOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskDue('');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleAssignPerson = async () => {
    if (!selectedPersonId) return;
    setIsSubmittingAssign(true);
    try {
      await assignPerson({
        personId: selectedPersonId,
        roleContext,
        capacityValue,
        capacityUnit: 'hours_per_week',
      });
      setIsAssignModalOpen(false);
      setSelectedPersonId('');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  if (isLoading || !project) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-6 w-32 bg-devoc-surface-secondary rounded animate-pulse" />
        <div className="h-10 w-64 bg-devoc-surface-secondary rounded animate-pulse" />
        <div className="h-48 w-full bg-devoc-surface-secondary rounded animate-pulse" />
      </div>
    );
  }

  const peopleMap = new Map<string, string>();
  people.forEach((p) => peopleMap.set(p.id, `${p.firstName} ${p.lastName}`));

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/pm/projects"
          className="text-xs text-devoc-text-muted hover:text-devoc-text-primary flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects Portfolio
        </Link>
      </div>

      {/* Cockpit Header */}
      <div className="p-5 rounded-md border border-devoc-border bg-devoc-surface space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-devoc-text-secondary">
                {project.code}
              </span>
              <span className="text-xs text-devoc-text-muted">•</span>
              <span className="text-xs uppercase font-semibold text-devoc-accent">
                {project.projectType}
              </span>
              <StatusBadge status={project.status} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-devoc-text-primary">
              {project.name}
            </h1>

            {project.description && (
              <p className="text-xs text-devoc-text-secondary mt-1 max-w-2xl">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAssignModalOpen(true)}
              className="h-8 text-xs font-medium"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Assign Team Member
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateTaskOpen(true)}
              className="h-8 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Sprint Task
            </Button>
          </div>
        </div>

        {/* Progress Bar & Sprint Velocity */}
        <div className="pt-3 border-t border-devoc-border grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">
              Sprint Completion
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-devoc-text-primary text-base">
                {progressPercent}%
              </span>
              <span className="text-devoc-text-muted text-[11px]">
                ({completedTasksCount}/{tasks.length} tasks)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-devoc-surface-secondary overflow-hidden">
              <div
                className="h-full bg-devoc-accent transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">
              Blockers / Attention
            </span>
            <div className="text-base font-bold font-mono text-devoc-text-primary">
              {blockedTasksCount > 0 ? (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {blockedTasksCount} blocked
                </span>
              ) : (
                <span className="text-emerald-600">Zero blockers</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">
              Active Team
            </span>
            <div className="text-base font-bold font-mono text-devoc-text-primary">
              {assignments.length} assigned members
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-devoc-text-muted block">
              Logged Work Logs
            </span>
            <div className="text-base font-bold font-mono text-devoc-text-primary">
              {workRecords.length} contributions
            </div>
          </div>
        </div>
      </div>

      {/* Progressive Disclosure Tabs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabList>
          <TabTrigger value="tasks">
            <ListTodo className="h-3.5 w-3.5 mr-1.5" />
            Tasks & Deliverables ({tasks.length})
          </TabTrigger>
          <TabTrigger value="team">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Team & Responsibility ({assignments.length})
          </TabTrigger>
          <TabTrigger value="work">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Team Work Contributions ({workRecords.length})
          </TabTrigger>
          <TabTrigger value="risks">
            <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
            Risks & Blockers
          </TabTrigger>
        </TabList>

        {/* Tab 1: Tasks */}
        <TabContent value="tasks" className="space-y-4">
          <TaskTable
            tasks={tasks}
            projects={[project]}
            showProjectColumn={false}
            onTaskClick={handleTaskClick}
            emptyTitle="No sprint tasks in this project"
            emptyDescription="Create tasks using the 'New Sprint Task' button above."
          />
        </TabContent>

        {/* Tab 2: Team & Responsibility */}
        <TabContent value="team" className="space-y-4">
          <div className="rounded-md border border-devoc-border bg-devoc-surface overflow-hidden">
            <table className="w-full text-xs text-devoc-text-primary">
              <thead>
                <tr className="border-b border-devoc-border bg-devoc-surface-secondary text-devoc-text-secondary font-medium">
                  <th className="px-3.5 py-2 text-left font-semibold text-[11px] uppercase">Team Member</th>
                  <th className="px-3.5 py-2 text-left font-semibold text-[11px] uppercase">Role Context</th>
                  <th className="px-3.5 py-2 text-center font-semibold text-[11px] uppercase">Allocated Capacity</th>
                  <th className="px-3.5 py-2 text-left font-semibold text-[11px] uppercase">Status</th>
                  <th className="px-3.5 py-2 text-right font-semibold text-[11px] uppercase">Assigned Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devoc-border/60">
                {assignments.length > 0 ? (
                  assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-devoc-surface-secondary/40">
                      <td className="px-3.5 py-2 font-medium text-devoc-text-primary">
                        {peopleMap.get(a.personId) || `#${a.personId.slice(0, 8)}`}
                      </td>
                      <td className="px-3.5 py-2 font-medium text-devoc-accent">
                        {a.roleContext || a.assignmentType}
                      </td>
                      <td className="px-3.5 py-2 text-center font-mono">
                        {a.capacityValue} {a.capacityUnit}
                      </td>
                      <td className="px-3.5 py-2">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-devoc-text-muted">
                        {new Date(a.startAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-devoc-text-muted">
                      No team members assigned to this project yet. Use 'Assign Team Member' above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabContent>

        {/* Tab 3: Team Work Contributions */}
        <TabContent value="work" className="space-y-4">
          <WorkTable
            records={workRecords}
            projects={[project]}
            canApprove={true}
            emptyTitle="No work logged for this project yet"
            emptyDescription="Team members have not recorded any contributions against this project."
          />
        </TabContent>

        {/* Tab 4: Risks & Blockers */}
        <TabContent value="risks" className="space-y-4">
          <div className="p-6 rounded-md border border-dashed border-devoc-border bg-devoc-surface space-y-3 text-center max-w-xl mx-auto">
            <ShieldAlert className="h-8 w-8 text-devoc-text-muted mx-auto" />
            <h3 className="text-sm font-semibold text-devoc-text-primary">
              Risk Management Governance Note
            </h3>
            <p className="text-xs text-devoc-text-secondary leading-relaxed">
              In accordance with Section 38 of the DeVoc OS Architecture specification, no dedicated Risk Engine exists in backend M1–M15. To preserve architectural integrity and avoid fabricated data, formal Risk Assessment is deferred to a future milestone.
            </p>
            <p className="text-[11px] text-devoc-text-muted">
              Current operational blockers are derived authoritatively from task status ({blockedTasksCount} blocked tasks).
            </p>
          </div>
        </TabContent>
      </Tabs>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        project={project}
        dependencies={taskDependencies}
        allTasks={tasks}
        canManage={true}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onStatusChange={async (taskId, status) => { await transitionTaskStatus(taskId, status); }}
        onAddDependency={async (taskId, dependsOnId) => { await addDependency(taskId, dependsOnId); }}
        onRemoveDependency={async (taskId, depId) => { await removeDependency(taskId, depId); }}
      />

      {/* Create Task Dialog */}
      <Dialog
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        title="Create New Sprint Task"
        description={`Add a feature, bug fix, or deliverable milestone to ${project.name}.`}
        maxWidth="md"
      >
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Task Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Implement schema migration for workforce time"
              className="h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-devoc-text-primary block">Task Type</label>
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value)}
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
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
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
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">Description</label>
            <textarea
              rows={2}
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              placeholder="Technical instructions and acceptance criteria..."
              className="w-full p-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent resize-none"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateTaskOpen(false)}
            disabled={isSubmittingTask}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCreateTask}
            disabled={isSubmittingTask || !newTaskTitle.trim()}
            className="text-xs h-8"
          >
            Create Task
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Assign Team Member Dialog */}
      <Dialog
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Team Member to Project"
        description="Designate official responsibility and capacity in M3 Assignment Engine."
        maxWidth="md"
      >
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Person <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
            >
              <option value="">Select a person...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Role Context <span className="text-red-500">*</span>
            </label>
            <Input
              value={roleContext}
              onChange={(e) => setRoleContext(e.target.value)}
              placeholder="e.g. Frontend Developer, Tech Lead"
              className="h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Allocated Capacity (Hours / Week) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="1"
              max="60"
              value={capacityValue}
              onChange={(e) => setCapacityValue(Number(e.target.value))}
              className="w-32 h-8 text-xs bg-devoc-surface border-devoc-border font-mono"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAssignModalOpen(false)}
            disabled={isSubmittingAssign}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAssignPerson}
            disabled={isSubmittingAssign || !selectedPersonId}
            className="text-xs h-8"
          >
            Confirm Assignment
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
