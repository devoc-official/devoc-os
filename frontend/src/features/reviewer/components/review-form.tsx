'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, CheckCircle2, AlertCircle, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ProgressionDecision } from '../types/reviewer.types';
import { EnrollmentMilestone } from '../../../api/learning.api';

const reviewSchema = z.object({
  summary: z.string().min(5, 'Review summary must be at least 5 characters'),
  feedback: z.string().min(10, 'Qualitative feedback must be at least 10 characters'),
  progressValue: z.number().min(0).max(100),
  decision: z.enum(['continue', 'advance', 'improve', 'repeat']),
  roadmapAction: z.enum(['none', 'complete_milestone', 'skip_milestone']).default('none'),
  selectedMilestoneId: z.string().optional(),
});

export type ReviewFormData = z.infer<typeof reviewSchema> & {
  suggestions: string[];
};

interface ReviewFormProps {
  currentMilestones?: EnrollmentMilestone[];
  currentMilestoneId?: string;
  isSubmitting?: boolean;
  onSubmit: (data: ReviewFormData) => Promise<void>;
  className?: string;
}

export function ReviewForm({
  currentMilestones = [],
  currentMilestoneId,
  isSubmitting = false,
  onSubmit,
  className = '',
}: ReviewFormProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [newSuggestion, setNewSuggestion] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      summary: '',
      feedback: '',
      progressValue: 50,
      decision: 'continue',
      roadmapAction: 'none',
      selectedMilestoneId: currentMilestoneId || '',
    },
  });

  const selectedDecision = watch('decision');
  const selectedRoadmapAction = watch('roadmapAction');

  const addSuggestion = () => {
    if (newSuggestion.trim().length > 3) {
      setSuggestions([...suggestions, newSuggestion.trim()]);
      setNewSuggestion('');
    }
  };

  const removeSuggestion = (index: number) => {
    setSuggestions(suggestions.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (data: z.infer<typeof reviewSchema>) => {
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      await onSubmit({ ...data, suggestions });
      setSubmitSuccess(true);
      reset();
      setSuggestions([]);
    } catch (err) {
      setSubmitError((err as Error).message || 'Failed to submit review');
    }
  };

  return (
    <Card className={`border-devoc-border bg-devoc-surface ${className}`}>
      <CardHeader className="p-4 sm:p-5 pb-3">
        <CardTitle className="text-sm font-semibold text-devoc-text-primary">
          Submit Learning Review & Progression Guidance
        </CardTitle>
        <CardDescription className="text-xs">
          Provide structured feedback and authoritative milestone progression guidance based on the current learning evidence.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="p-4 sm:p-5 pt-0 space-y-4 text-xs">
          {submitError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Review submitted and recorded to learning history successfully.</span>
            </div>
          )}

          {/* Progression Decision Radio Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-devoc-text-primary block">
              Progression Decision <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['continue', 'advance', 'improve', 'repeat'] as const).map((dec) => {
                const isSelected = selectedDecision === dec;
                return (
                  <button
                    key={dec}
                    type="button"
                    onClick={() => setValue('decision', dec)}
                    className={`p-2.5 rounded-md border text-center font-medium capitalize transition-all text-xs ${
                      isSelected
                        ? 'border-devoc-brand bg-devoc-brand/10 text-devoc-brand font-semibold ring-1 ring-devoc-brand'
                        : 'border-devoc-border bg-devoc-surface text-devoc-text-secondary hover:border-devoc-border-hover'
                    }`}
                  >
                    {dec}
                  </button>
                );
              })}
            </div>
            {errors.decision && <p className="text-[11px] text-rose-500">{errors.decision.message}</p>}
          </div>

          {/* Review Summary */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-devoc-text-primary block">
              Executive Summary <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Completed TypeScript milestone deliverables with clean architecture"
              {...register('summary')}
              className="text-xs"
            />
            {errors.summary && <p className="text-[11px] text-rose-500">{errors.summary.message}</p>}
          </div>

          {/* Detailed Feedback */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-devoc-text-primary block">
              Qualitative Feedback & Observations <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Explain strengths, code review notes, architecture trade-offs, and areas needing improvement..."
              {...register('feedback')}
              className="w-full rounded-md border border-devoc-border bg-devoc-surface p-2.5 text-xs text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-brand resize-none"
            />
            {errors.feedback && <p className="text-[11px] text-rose-500">{errors.feedback.message}</p>}
          </div>

          {/* Actionable Suggestions */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-devoc-text-primary block">
              Actionable Suggestions & Follow-Up Items
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Refactor API error handling to use centralized envelope"
                value={newSuggestion}
                onChange={(e) => setNewSuggestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSuggestion();
                  }
                }}
                className="text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addSuggestion} className="shrink-0 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-devoc-surface-hover/60 border border-devoc-border/60 text-xs"
                  >
                    <span className="text-devoc-text-primary">{sug}</span>
                    <button
                      type="button"
                      onClick={() => removeSuggestion(idx)}
                      className="text-devoc-text-tertiary hover:text-rose-500 p-1"
                      aria-label="Remove suggestion"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Milestone Progression Action (Optional M7 roadmap action) */}
          <div className="p-3 bg-devoc-surface-hover/30 border border-devoc-border/70 rounded-md space-y-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-devoc-text-tertiary block">
                Roadmap Transition Action
              </span>
              <p className="text-[11px] text-devoc-text-secondary">
                Optionally apply an authoritative roadmap change to this student's learning journey.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'none', label: 'No Change' },
                { id: 'complete_milestone', label: 'Complete Milestone' },
                { id: 'skip_milestone', label: 'Skip Milestone' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setValue('roadmapAction', opt.id as any)}
                  className={`p-2 rounded border text-xs text-center transition-all ${
                    selectedRoadmapAction === opt.id
                      ? 'border-devoc-brand bg-devoc-brand/10 text-devoc-brand font-semibold'
                      : 'border-devoc-border bg-devoc-surface text-devoc-text-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {selectedRoadmapAction !== 'none' && currentMilestones.length > 0 && (
              <div className="space-y-1 pt-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-devoc-text-tertiary">
                  Target Milestone
                </label>
                <select
                  {...register('selectedMilestoneId')}
                  className="w-full rounded border border-devoc-border bg-devoc-surface p-2 text-xs text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-brand"
                >
                  {currentMilestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.sequence}. {m.title} ({m.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-4 sm:p-5 pt-0 flex justify-end gap-2 border-t border-devoc-border/60">
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="text-xs">
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1.5" /> Submit Final Review
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
