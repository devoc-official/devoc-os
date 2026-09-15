'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, HelpCircle, ArrowRight, Award } from 'lucide-react';
import { Assessment, AssessmentAttempt } from '../../../api/learning.api';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogFooter } from '../../../components/ui/dialog';

interface AssessmentCardProps {
  assessment: Assessment;
  attempts: AssessmentAttempt[];
  onSubmitAttempt?: (assessmentId: string, metadata?: Record<string, any>) => Promise<any>;
  isSubmitting?: boolean;
}

export function AssessmentCard({
  assessment,
  attempts,
  onSubmitAttempt,
  isSubmitting,
}: AssessmentCardProps) {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const assessmentAttempts = attempts.filter((a) => a.assessmentId === assessment.id);
  const passedAttempt = assessmentAttempts.find((a) => a.passed === true);
  const latestAttempt = assessmentAttempts[assessmentAttempts.length - 1];

  const handleStartAttempt = async () => {
    if (!onSubmitAttempt) return;
    await onSubmitAttempt(assessment.id, { notes });
    setDialogOpen(false);
    setNotes('');
  };

  return (
    <>
      <div className="rounded-lg border border-devoc-border bg-devoc-card p-4 transition-all hover:border-devoc-border-hover space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-devoc-border/50 pb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-devoc-text-primary">
              {assessment.title}
            </h4>
            {passedAttempt ? (
              <Badge variant="success" size="sm">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Passed
              </Badge>
            ) : assessmentAttempts.length > 0 ? (
              <Badge variant="warning" size="sm">
                Attempted ({assessmentAttempts.length})
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                Not Started
              </Badge>
            )}
          </div>

          <span className="font-mono text-[11px] text-devoc-text-secondary">
            Max Score: {assessment.maxScore}
          </span>
        </div>

        {assessment.description && (
          <p className="text-xs text-devoc-text-secondary leading-relaxed">
            {assessment.description}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-devoc-border/40 pt-2 text-xs">
          <div className="text-[11px] font-mono text-devoc-text-tertiary">
            {assessmentAttempts.length > 0 ? (
              <span>
                Latest score: {latestAttempt?.score ?? 'Pending'} / {assessment.maxScore}
              </span>
            ) : (
              <span>0 previous attempts</span>
            )}
          </div>

          {onSubmitAttempt && !passedAttempt && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="text-xs h-7 px-3 text-devoc-brand border-devoc-brand/30 hover:bg-devoc-brand/5"
            >
              Start Attempt
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Attempt Modal */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Start Assessment Attempt"
        description={`You are about to submit an attempt for "${assessment.title}". Once submitted, the attempt will be evaluated authoritatively by the backend grading engine.`}
      >
        <div className="space-y-3 py-2 text-xs">
          <div className="rounded-md bg-devoc-bg p-3 border border-devoc-border text-devoc-text-secondary space-y-1">
            <span className="font-semibold block text-devoc-text-primary">Submission Guidelines</span>
            <p>• Make sure you have completed the prerequisite milestone activities.</p>
            <p>• Your submission will be recorded append-only in the audit ledger.</p>
          </div>

          <div>
            <label className="block font-medium text-devoc-text-primary mb-1">
              Submission Notes / Solution URL (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide github commit hash or implementation notes..."
              rows={3}
              className="w-full rounded-md border border-devoc-border bg-devoc-bg px-3 py-2 text-xs font-mono focus:border-devoc-brand focus:outline-hidden"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStartAttempt}
            disabled={isSubmitting}
            className="text-xs"
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
