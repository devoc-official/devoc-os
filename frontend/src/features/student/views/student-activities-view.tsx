'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ListTodo,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  BookOpen,
  Code2,
  FileText,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useRoadmap } from '../hooks/use-roadmap';
import { ActivityItem } from '../components/activity-item';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentActivitiesView() {
  const {
    activities,
    milestones,
    currentActivity,
    completeActivity,
    isLoading,
  } = useRoadmap();

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Search text
      if (
        search &&
        !act.title.toLowerCase().includes(search.toLowerCase()) &&
        !act.description?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'current') {
          if (act.id !== currentActivity?.id) return false;
        } else if (act.status !== statusFilter) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && act.activityType.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [activities, search, statusFilter, typeFilter, currentActivity]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  const completedCount = activities.filter((a) => a.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Curriculum Activities
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Personalized reading, practice exercises, project milestones, and review checkpoints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-devoc-text-secondary">
            {completedCount} of {activities.length} completed
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-lg border border-devoc-border bg-devoc-card p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-devoc-text-tertiary" />
            <Input
              type="text"
              placeholder="Search activities by title, description, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-devoc-bg"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Status filter buttons */}
            <div className="flex items-center gap-1 border border-devoc-border rounded-md p-0.5 bg-devoc-bg text-xs">
              {['all', 'current', 'active', 'completed', 'pending'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-[11px] capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-devoc-card font-semibold text-devoc-text-primary shadow-xs'
                      : 'text-devoc-text-secondary hover:text-devoc-text-primary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-devoc-border bg-devoc-bg px-2.5 text-xs text-devoc-text-primary focus:border-devoc-brand focus:outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="reading">Reading</option>
              <option value="practice">Practice</option>
              <option value="project">Project</option>
              <option value="assessment">Assessment</option>
              <option value="review">Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activities Scannable List */}
      <div className="space-y-2.5">
        {filteredActivities.length === 0 ? (
          <div className="rounded-lg border border-devoc-border bg-devoc-card p-10 text-center space-y-2">
            <ListTodo className="mx-auto h-8 w-8 text-devoc-text-tertiary" />
            <h4 className="text-xs font-semibold text-devoc-text-primary">No Matching Activities</h4>
            <p className="text-xs text-devoc-text-secondary">
              Try adjusting your search criteria or status filter.
            </p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              isCurrent={activity.id === currentActivity?.id}
              onComplete={completeActivity}
            />
          ))
        )}
      </div>
    </div>
  );
}
