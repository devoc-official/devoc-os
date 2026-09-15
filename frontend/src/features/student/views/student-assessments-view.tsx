'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  Award,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { useEnrollment } from '../hooks/use-enrollment';
import { useAssessments } from '../hooks/use-assessments';
import { AssessmentCard } from '../components/assessment-card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

export function StudentAssessmentsView() {
  const { activeEnrollment, activeProgram } = useEnrollment();
  const { assessments, attempts, submitAttempt, isSubmittingAttempt, isLoading } =
    useAssessments(activeEnrollment?.id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const passedCount = attempts.filter((a) => a.passed === true).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
            Curriculum Assessments
          </h1>
          <p className="text-xs text-devoc-text-secondary mt-1">
            Authoritative knowledge checks, practical architectural evaluations, and competency certifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-md border border-devoc-border bg-devoc-card px-3 py-1.5 text-xs font-mono">
            <span className="text-devoc-brand font-bold">{passedCount}</span> of{' '}
            <span className="text-devoc-text-primary font-bold">{assessments.length}</span> passed
          </div>
        </div>
      </div>

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-12 text-center space-y-3">
          <Award className="mx-auto h-10 w-10 text-devoc-text-tertiary" />
          <h3 className="text-sm font-bold text-devoc-text-primary">No Assessments Scheduled</h3>
          <p className="text-xs text-devoc-text-secondary max-w-sm mx-auto">
            Assessments will become available as you reach milestone checkpoints in your personalized roadmap.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              attempts={attempts}
              onSubmitAttempt={async (id, meta) => {
                await submitAttempt({ assessmentId: id, metadata: meta });
              }}
              isSubmitting={isSubmittingAttempt}
            />
          ))}
        </div>
      )}

      {/* Attempt History Section */}
      {attempts.length > 0 && (
        <div className="rounded-lg border border-devoc-border bg-devoc-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-devoc-border/60 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-devoc-brand" />
              <h3 className="text-xs font-bold text-devoc-text-primary">
                Official Attempt History & Audit Log
              </h3>
            </div>
            <span className="font-mono text-[10px] text-devoc-text-tertiary">
              {attempts.length} attempts recorded
            </span>
          </div>

          <div className="divide-y divide-devoc-border/60 text-xs">
            {attempts.map((att) => {
              const assessment = assessments.find((a) => a.id === att.assessmentId);
              return (
                <div key={att.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-devoc-text-primary">
                        {assessment?.title || 'Milestone Assessment'}
                      </span>
                      <span className="font-mono text-[10px] text-devoc-text-tertiary">
                        Attempt #{att.attemptNumber}
                      </span>
                      {att.passed === true ? (
                        <Badge variant="success" size="sm">
                          Passed
                        </Badge>
                      ) : att.passed === false ? (
                        <Badge variant="warning" size="sm">
                          Needs Improvement
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Under Evaluation
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-devoc-text-tertiary font-mono block mt-0.5">
                      Submitted: {new Date(att.submittedAt).toLocaleDateString()}
                      {att.score !== null && att.score !== undefined && ` • Score: ${att.score}`}
                    </span>
                  </div>

                  {att.feedback && (
                    <span className="text-xs text-devoc-text-secondary max-w-xs truncate hidden sm:inline">
                      {att.feedback}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
