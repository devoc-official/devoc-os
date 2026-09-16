'use client';

import React, { useState } from 'react';
import { useAcademyReviews } from '../hooks/use-academy-reviews';
import { DataTable, Column } from '../../../components/data/data-table';
import { Input } from '../../../components/ui/input';
import { LearningReview } from '../../../api/learning.api';
import { Calendar, Search, CheckCircle2 } from 'lucide-react';

export function AcademyReviewsView() {
  const { reviews, peopleMap, enrollmentStudentMap, isLoading } = useAcademyReviews();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReviews = reviews.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const student = enrollmentStudentMap.get(r.enrollmentId)?.toLowerCase() || '';
    const reviewer = peopleMap.get(r.reviewerPersonId)?.toLowerCase() || '';
    const summary = r.summary?.toLowerCase() || '';
    return student.includes(q) || reviewer.includes(q) || summary.includes(q);
  });

  const columns: Column<LearningReview>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <span className="font-semibold text-xs text-devoc-text-primary">
          {enrollmentStudentMap.get(r.enrollmentId) || `Enrollment #${r.enrollmentId.slice(0, 8)}`}
        </span>
      ),
    },
    {
      key: 'reviewer',
      header: 'Reviewer / Mentor',
      width: '160px',
      render: (r) => (
        <span className="text-xs text-devoc-text-secondary">
          {peopleMap.get(r.reviewerPersonId) || `Reviewer #${r.reviewerPersonId.slice(0, 8)}`}
        </span>
      ),
    },
    {
      key: 'reviewType',
      header: 'Review Type',
      width: '130px',
      render: (r) => (
        <span className="text-[11px] uppercase font-mono font-medium text-devoc-accent">
          {r.reviewType.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'reviewedAt',
      header: 'Review Date',
      width: '130px',
      render: (r) => (
        <span className="text-xs text-devoc-text-muted font-mono">
          {new Date(r.reviewedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'summary',
      header: 'Summary Feedback',
      render: (r) => (
        <div>
          <span className="text-xs text-devoc-text-primary font-medium line-clamp-1">{r.summary}</span>
          {r.feedback && (
            <p className="text-[11px] text-devoc-text-muted line-clamp-1">{r.feedback}</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary flex items-center gap-2">
          <Calendar className="h-5 w-5 text-devoc-accent" />
          Academy Review Operations
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Weekly and bi-weekly milestone evaluations, mentor feedback records, and roadmap progression approvals.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between">
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-devoc-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student or reviewer..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <DataTable
        columns={columns}
        data={filteredReviews}
        keyField="id"
        isLoading={isLoading}
        emptyTitle="No reviews found"
        emptyDescription="No evaluation reviews match your filter criteria."
      />
    </div>
  );
}
