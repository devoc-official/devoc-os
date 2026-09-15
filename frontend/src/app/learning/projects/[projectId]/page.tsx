'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FolderGit2, CheckCircle2, Clock, ListTodo, Briefcase } from 'lucide-react';
import { useAuth } from '../../../../auth/use-auth';
import { projectsApi, Project, Task } from '../../../../api/projects.api';
import { workApi, WorkRecord } from '../../../../api/work.api';
import { AppShell } from '../../../../layouts/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Skeleton } from '../../../../components/ui/skeleton';

export default function StudentProjectDetailPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || '';
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.organizationId;

  // 1. Fetch Project
  const { data: project = null, isLoading: isProjectLoading } = useQuery({
    queryKey: ['student', 'project', orgId, projectId],
    queryFn: async () => {
      if (!orgId || !projectId) return null;
      return projectsApi.getProjectById(orgId, projectId);
    },
    enabled: Boolean(orgId && projectId),
  });

  // 2. Fetch Tasks
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['student', 'project-tasks', orgId, projectId],
    queryFn: async () => {
      if (!orgId || !projectId) return [];
      return projectsApi.listProjectTasks(orgId, projectId);
    },
    enabled: Boolean(orgId && projectId),
  });

  // 3. Fetch Student Work Records on this project
  const { data: workRecords = [], isLoading: isWorkLoading } = useQuery({
    queryKey: ['student', 'project-work', orgId, projectId, user?.id],
    queryFn: async () => {
      if (!orgId || !projectId || !user?.id) return [];
      return workApi.listWorkRecords(orgId, {
        personId: user.id,
        targetType: 'project',
        targetId: projectId,
      });
    },
    enabled: Boolean(orgId && projectId && user?.id),
  });

  if (isProjectLoading || isTasksLoading || isWorkLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto rounded-xl border border-devoc-border bg-devoc-card p-12 text-center space-y-3">
          <h3 className="text-sm font-bold text-devoc-text-primary">Project Not Found</h3>
          <p className="text-xs text-devoc-text-secondary">
            The requested project could not be found or you do not have permission to view it.
          </p>
          <Link href="/learning/projects">
            <Button size="sm" variant="outline" className="text-xs mt-2">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const completedTasks = tasks.filter((t) => t.status === 'done').length;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link
            href="/learning/projects"
            className="inline-flex items-center text-xs font-medium text-devoc-text-secondary hover:text-devoc-text-primary transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Projects
          </Link>
        </div>

        {/* Project Header Card */}
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-devoc-border/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-devoc-brand" />
                <h1 className="text-lg font-bold text-devoc-text-primary">{project.name}</h1>
                <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                  {project.code}
                </Badge>
                <Badge variant="brand" size="sm" className="capitalize">
                  {project.status}
                </Badge>
              </div>
              <p className="text-xs text-devoc-text-secondary mt-1 max-w-2xl leading-relaxed">
                {project.description || 'Production engineering project deliverable.'}
              </p>
            </div>

            <div className="text-right text-xs font-mono">
              <span className="text-devoc-text-secondary">Type: {project.projectType}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-md bg-devoc-bg/60 p-3 border border-devoc-border/60">
              <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                Tasks Completed
              </span>
              <span className="text-sm font-bold font-mono text-devoc-text-primary mt-0.5 block">
                {completedTasks} of {tasks.length}
              </span>
            </div>

            <div className="rounded-md bg-devoc-bg/60 p-3 border border-devoc-border/60">
              <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                Work Contributions
              </span>
              <span className="text-sm font-bold font-mono text-devoc-text-primary mt-0.5 block">
                {workRecords.length} recorded logs
              </span>
            </div>

            <div className="rounded-md bg-devoc-bg/60 p-3 border border-devoc-border/60">
              <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                Started
              </span>
              <span className="text-sm font-mono text-devoc-text-primary mt-0.5 block">
                {project.startedAt ? new Date(project.startedAt).toLocaleDateString() : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Project Tasks */}
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-devoc-border/60 pb-3">
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-devoc-brand" />
              <h3 className="text-xs font-bold text-devoc-text-primary">
                Project Tasks ({tasks.length})
              </h3>
            </div>
          </div>

          {tasks.length === 0 ? (
            <p className="text-xs text-devoc-text-secondary py-4 text-center">
              No tasks currently tracked in this project.
            </p>
          ) : (
            <div className="divide-y divide-devoc-border/60 text-xs">
              {tasks.map((task) => (
                <div key={task.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        task.status === 'done'
                          ? 'bg-emerald-500'
                          : task.status === 'in_progress'
                          ? 'bg-devoc-brand'
                          : 'bg-devoc-text-tertiary'
                      }`}
                    />
                    <div>
                      <span className="font-semibold text-devoc-text-primary">{task.title}</span>
                      {task.description && (
                        <p className="text-[11px] text-devoc-text-secondary line-clamp-1">{task.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="neutral" size="sm" className="capitalize">
                      {task.status}
                    </Badge>
                    <Badge variant="neutral" size="sm" className="capitalize">
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Work Contributions */}
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-devoc-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-devoc-brand" />
              <h3 className="text-xs font-bold text-devoc-text-primary">
                Your Logged Work Contributions ({workRecords.length})
              </h3>
            </div>
          </div>

          {workRecords.length === 0 ? (
            <p className="text-xs text-devoc-text-secondary py-4 text-center">
              No work logs recorded yet for this project.
            </p>
          ) : (
            <div className="divide-y divide-devoc-border/60 text-xs">
              {workRecords.map((wr) => (
                <div key={wr.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-devoc-text-primary">{wr.title}</span>
                    <span className="text-[11px] font-mono text-devoc-text-tertiary block mt-0.5">
                      {wr.durationMinutes} min • {wr.status}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-devoc-text-tertiary">
                    {new Date(wr.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
