'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  BookOpen,
  Code2,
  FileText,
  HelpCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Send,
} from 'lucide-react';
import { useRoadmap } from '../hooks/use-roadmap';
import { useReviews } from '../hooks/use-reviews';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';

interface StudentActivityDetailViewProps {
  activityId: string;
}

export function StudentActivityDetailView({ activityId }: StudentActivityDetailViewProps) {
  const router = useRouter();
  const { activities, milestones, completeActivity, nextActivity, isLoading } = useRoadmap();
  const { suggestions } = useReviews();

  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const activity = activities.find((a) => a.id === activityId);
  const milestone = milestones.find((m) => m.id === activity?.enrollmentMilestoneId);

  // Suggestions connected to this activity
  const relatedSuggestions = suggestions.filter(
    (s) => s.relatedActivityId === activityId
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="rounded-xl border border-devoc-border bg-devoc-card p-12 text-center space-y-3">
        <h3 className="text-sm font-bold text-devoc-text-primary">Activity Not Found</h3>
        <p className="text-xs text-devoc-text-secondary">
          The requested learning activity does not exist or has been modified.
        </p>
        <Link href="/learning/activities">
          <Button size="sm" variant="outline" className="text-xs mt-2">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Activities
          </Button>
        </Link>
      </div>
    );
  }

  const isCompleted = activity.status === 'completed';

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await completeActivity(activity.id);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/learning/activities"
          className="inline-flex items-center text-xs font-medium text-devoc-text-secondary hover:text-devoc-text-primary transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Activities
        </Link>
      </div>

      {/* Activity Header */}
      <div className="rounded-xl border border-devoc-border bg-devoc-card p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-devoc-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="brand" size="sm" className="capitalize">
                {activity.activityType} Activity
              </Badge>
              {milestone && (
                <span className="text-xs font-mono text-devoc-text-tertiary">
                  Milestone: {milestone.title}
                </span>
              )}
              {isCompleted ? (
                <Badge variant="success" size="sm">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Completed
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm" className="capitalize">
                  {activity.status}
                </Badge>
              )}
            </div>
            <h1 className="text-lg font-bold text-devoc-text-primary mt-2">
              {activity.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isCompleted && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleComplete}
                disabled={isSubmitting}
                className="text-xs h-9 px-4 font-semibold"
              >
                {isSubmitting ? 'Recording...' : 'Mark as Completed'}
                <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* 1. Purpose & Learning Objectives */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-devoc-text-tertiary font-mono">
            Purpose & Learning Objectives
          </h3>
          <p className="text-xs text-devoc-text-secondary leading-relaxed">
            {activity.description ||
              'This activity builds practical competencies required for the current milestone. Complete the deliverables and submit relevant evidence or code links for mentor review.'}
          </p>
        </div>

        {/* 2. Instructions & Deliverables */}
        <div className="rounded-lg bg-devoc-bg/70 p-4 border border-devoc-border/60 space-y-2">
          <h4 className="text-xs font-semibold text-devoc-text-primary">Expected Output & Deliverable</h4>
          <ul className="text-xs text-devoc-text-secondary space-y-1.5 list-disc list-inside leading-relaxed">
            <li>Review the recommended architecture patterns and documentation.</li>
            <li>Implement the required domain models and write unit/integration tests.</li>
            <li>Ensure tenant isolation and state machines are strictly respected.</li>
            <li>Submit PR or commit references for your mentor&apos;s weekly evaluation.</li>
          </ul>
        </div>
      </div>

      {/* 3. Resources & Contextual References */}
      <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-devoc-text-tertiary font-mono">
          References & Guidance
        </h3>
        <div className="divide-y divide-devoc-border/60 text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-semibold text-devoc-text-primary block">DeVoc Architecture & ADRs</span>
              <span className="text-[11px] text-devoc-text-secondary">Core architectural principles and multi-tenancy rules</span>
            </div>
            <Badge variant="neutral" size="sm">Documentation</Badge>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-semibold text-devoc-text-primary block">Testing Requirements</span>
              <span className="text-[11px] text-devoc-text-secondary">Authoritative tenant isolation and state machine tests</span>
            </div>
            <Badge variant="neutral" size="sm">Standard</Badge>
          </div>
        </div>
      </div>

      {/* 4. Submission & Evidence Box */}
      <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-devoc-text-tertiary font-mono">
          Submission & Evidence (Optional)
        </h3>
        <p className="text-xs text-devoc-text-secondary">
          Attach a GitHub PR, commit hash, or design link to present during your next mentor sync.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-devoc-text-primary mb-1">
              Deliverable URL / Repository Link
            </label>
            <input
              type="text"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full rounded-md border border-devoc-border bg-devoc-bg px-3 py-2 text-xs font-mono focus:border-devoc-brand focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-medium text-devoc-text-primary mb-1">
              Implementation Notes
            </label>
            <textarea
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Brief summary of challenges solved or questions for your mentor..."
              rows={3}
              className="w-full rounded-md border border-devoc-border bg-devoc-bg px-3 py-2 text-xs focus:border-devoc-brand focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* 5. Feedback related to this activity */}
      {relatedSuggestions.length > 0 && (
        <div className="rounded-xl border border-devoc-border bg-devoc-card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-devoc-text-tertiary font-mono">
            Reviewer Feedback on This Activity
          </h3>
          <div className="space-y-2">
            {relatedSuggestions.map((sug) => (
              <div key={sug.id} className="rounded-md border border-devoc-border p-3 text-xs bg-devoc-bg/50">
                <span className="font-semibold text-devoc-text-primary block">{sug.text}</span>
                <p className="text-devoc-text-secondary text-[11px] mt-1">{sug.requiredAction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Next Step */}
      {nextActivity && (
        <div className="rounded-lg border border-devoc-border/60 bg-devoc-bg/60 p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
              Next in sequence
            </span>
            <span className="text-xs font-semibold text-devoc-text-primary mt-0.5 block">
              {nextActivity.title}
            </span>
          </div>
          <Link href={`/learning/activities/${nextActivity.id}`}>
            <Button size="sm" variant="ghost" className="text-xs text-devoc-brand hover:underline">
              <span>Continue</span>
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
