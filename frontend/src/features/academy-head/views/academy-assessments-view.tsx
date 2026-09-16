'use client';

import React, { useState } from 'react';
import { useAcademyStudents } from '../hooks/use-academy-students';
import { useAcademyReviews } from '../hooks/use-academy-reviews';
import { DataTable, Column } from '../../../components/data/data-table';
import { StatusBadge } from '../../../components/data/status-badge';
import { Input } from '../../../components/ui/input';
import { Award, Search } from 'lucide-react';
import { LearningReview } from '../../../api/learning.api';

export function AcademyAssessmentsView() {
  const { studentRows, isLoading: isStudentsLoading } = useAcademyStudents();
  const { reviews, peopleMap, enrollmentStudentMap, isLoading: isReviewsLoading } = useAcademyReviews();
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
      header: 'Student Candidate',
      render: (r) => (
        <span className="font-semibold text-xs text-devoc-text-primary">
          {enrollmentStudentMap.get(r.enrollmentId) || `Enrollment #${r.enrollmentId.slice(0, 8)}`}
        </span>
      ),
    },
    {
      key: 'reviewer',
      header: 'Assessing Reviewer',
      width: '160px',
      render: (r) => (
        <span className="text-xs text-devoc-text-secondary">
          {peopleMap.get(r.reviewerPersonId) || `Reviewer #${r.reviewerPersonId.slice(0, 8)}`}
        </span>
      ),
    },
    {
      key: 'reviewType',
      header: 'Assessment Type',
      width: '140px',
      render: (r) => (
        <span className="text-[11px] uppercase font-mono font-medium text-devoc-accent">
          {r.reviewType.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'reviewedAt',
      header: 'Assessment Date',
      width: '130px',
      render: (r) => (
        <span className="text-xs text-devoc-text-muted font-mono">
          {new Date(r.reviewedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'summary',
      header: 'Competency Verdict & Feedback',
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
          <Award className="h-5 w-5 text-devoc-accent" />
          Competency Assessments & Milestone Evaluations
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Quality assurance across student competency milestones, defense presentations, and formal milestone clearances.
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
              placeholder="Search assessment..."
              className="pl-8 h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>
        </div>
      </div>

      {/* Assessments Table */}
      <DataTable
        columns={columns}
        data={filteredReviews}
        keyField="id"
        isLoading={isStudentsLoading || isReviewsLoading}
        emptyTitle="No assessments recorded"
        emptyDescription="No milestone assessments match your search query."
      />
    </div>
  );
}
