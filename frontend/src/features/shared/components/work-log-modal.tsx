'use client';

import React, { useState } from 'react';
import { WorkCategory } from '../../../api/work.api';
import { Project } from '../../../api/projects.api';
import { Dialog, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Clock, Plus, Link as LinkIcon, AlertCircle } from 'lucide-react';

export interface WorkLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: WorkCategory[];
  projects?: Project[];
  onSubmit: (payload: {
    title: string;
    categoryId: string;
    durationMinutes: number;
    description?: string;
    targetType?: string;
    targetId?: string;
    evidenceTitle?: string;
    evidenceUrl?: string;
    autoSubmit?: boolean;
  }) => Promise<any>;
}

export function WorkLogModal({
  isOpen,
  onClose,
  categories,
  projects = [],
  onSubmit,
}: WorkLogModalProps) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [projectId, setProjectId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [description, setDescription] = useState('');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setCategoryId(categories[0]?.id || '');
    setProjectId('');
    setDurationMinutes(60);
    setDescription('');
    setEvidenceTitle('');
    setEvidenceUrl('');
    setErrorMsg(null);
  };

  const handleSave = async (autoSubmit: boolean) => {
    if (!title.trim()) {
      setErrorMsg('Please provide a contribution title.');
      return;
    }
    const catId = categoryId || categories[0]?.id;
    if (!catId) {
      setErrorMsg('Please select a work category.');
      return;
    }
    if (durationMinutes <= 0) {
      setErrorMsg('Duration must be greater than 0 minutes.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        categoryId: catId,
        durationMinutes,
        description: description.trim() || undefined,
        targetType: projectId ? 'project' : undefined,
        targetId: projectId || undefined,
        evidenceTitle: evidenceTitle.trim() || undefined,
        evidenceUrl: evidenceUrl.trim() || undefined,
        autoSubmit,
      });
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save work contribution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Log Work Contribution"
      description="Record engineering deliverables, tasks completed, or operational activities with optional evidence."
      maxWidth="md"
    >
      <div className="space-y-3.5 py-1">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement multi-tenant authentication interceptor"
              className="h-8 text-xs bg-devoc-surface border-devoc-border"
            />
          </div>

          {/* Category & Project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-devoc-text-primary block">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-devoc-text-primary block">
                Target Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent"
              >
                <option value="">No Project (General)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Duration (Minutes) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="5"
                step="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-32 h-8 text-xs bg-devoc-surface border-devoc-border font-mono"
              />
              <div className="flex gap-1.5">
                {[30, 60, 120, 240].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDurationMinutes(m)}
                    className="px-2 py-1 text-[11px] rounded border border-devoc-border bg-devoc-surface hover:bg-devoc-surface-secondary text-devoc-text-secondary transition-colors"
                  >
                    {m >= 60 ? `${m / 60}h` : `${m}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-devoc-text-primary block">
              Description & Summary
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline specific deliverables achieved, architectural decisions made, or challenges resolved..."
              className="w-full p-2.5 text-xs bg-devoc-surface border border-devoc-border rounded-md text-devoc-text-primary focus:outline-none focus:ring-1 focus:ring-devoc-accent resize-none"
            />
          </div>

          {/* Optional Evidence */}
          <div className="p-3 rounded-md bg-devoc-surface-secondary/40 border border-devoc-border space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-devoc-text-secondary">
              <LinkIcon className="h-3.5 w-3.5 text-devoc-accent" />
              <span>Deliverable Evidence (Optional)</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
                placeholder="Title (e.g. PR #42 or Commit SHA)"
                className="h-7 text-xs bg-devoc-surface border-devoc-border"
              />
              <Input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="URL (e.g. GitHub PR link)"
                className="h-7 text-xs bg-devoc-surface border-devoc-border"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-8"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Submit Contribution
            </Button>
          </div>
        </DialogFooter>
    </Dialog>
  );
}
