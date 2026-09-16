'use client';

import React from 'react';
import { useDeveloperEvidence, DeveloperEvidenceItem } from '../hooks/use-developer-evidence';
import { DataTable, Column } from '../../../components/data/data-table';
import { GitPullRequest, ExternalLink, FileText } from 'lucide-react';

export function DeveloperEvidenceView() {
  const { evidenceItems, isLoading } = useDeveloperEvidence();

  const columns: Column<DeveloperEvidenceItem>[] = [
    {
      key: 'title',
      header: 'Deliverable Title',
      render: (item) => (
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-4 w-4 text-devoc-accent flex-shrink-0" />
          <span className="font-semibold text-xs text-devoc-text-primary">{item.title}</span>
        </div>
      ),
    },
    {
      key: 'workTitle',
      header: 'Associated Work Contribution',
      render: (item) => (
        <span className="text-xs text-devoc-text-secondary truncate block max-w-[200px]">
          {item.workTitle}
        </span>
      ),
    },
    {
      key: 'evidenceUrl',
      header: 'Evidence Reference / URL',
      render: (item) => {
        if (!item.evidenceUrl) return <span className="text-devoc-text-muted text-[11px]">—</span>;
        return (
          <a
            href={item.evidenceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-devoc-accent hover:underline flex items-center gap-1 truncate max-w-[250px]"
          >
            <span className="truncate">{item.evidenceUrl}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Attached Date',
      width: '120px',
      render: (item) => (
        <span className="text-[11px] text-devoc-text-secondary font-mono">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Evidence Ledger
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          M5 Deliverable Evidence: pull requests, commit references, architecture documents, and technical deliverables.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={evidenceItems}
        keyField="id"
        isLoading={isLoading}
        emptyTitle="No deliverable evidence records found"
        emptyDescription="Attach PR links or commit hashes when logging work contributions to populate this ledger."
      />
    </div>
  );
}
