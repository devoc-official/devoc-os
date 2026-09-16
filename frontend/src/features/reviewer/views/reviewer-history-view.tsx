'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Search, Filter, ArrowRight, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useReviewerHistory } from '../hooks/use-reviewer-history';
import { ProgressionDecisionBadge } from '../components/progression-decision-badge';

export function ReviewerHistoryView() {
  const {
    history,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedDecision,
    setSelectedDecision,
  } = useReviewerHistory();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-devoc-text-primary">
          Review History Archive
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Historical log of milestone evaluations, progression decisions, and qualitative feedback recorded across the platform.
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border-devoc-border bg-devoc-surface">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-devoc-text-tertiary" />
            <Input
              placeholder="Search by student or review summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-devoc-text-tertiary" />
            <span className="text-[11px] text-devoc-text-tertiary uppercase font-mono">Decision:</span>
            {['all', 'advance', 'continue', 'improve', 'repeat'].map((dec) => (
              <Button
                key={dec}
                variant={selectedDecision === dec ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedDecision(dec)}
                className="text-xs h-7 capitalize px-2.5"
              >
                {dec}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* History Archive Table */}
      <Card className="border-devoc-border bg-devoc-surface">
        <CardContent className="p-0">
          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-devoc-surface-hover/50 text-[10px] uppercase font-mono tracking-wider text-devoc-text-tertiary border-b border-devoc-border">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Program Track</th>
                    <th className="py-2.5 px-4">Review Summary</th>
                    <th className="py-2.5 px-4">Decision</th>
                    <th className="py-2.5 px-4">Reviewed Date</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-devoc-border/60">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-devoc-surface-hover/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-devoc-text-primary">{item.studentName}</div>
                        <div className="text-[11px] font-mono text-devoc-text-tertiary">{item.studentEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-devoc-text-secondary font-medium">
                        {item.programName}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-devoc-text-primary">
                        {item.summary}
                      </td>
                      <td className="py-3 px-4">
                        <ProgressionDecisionBadge decision={item.decision} />
                      </td>
                      <td className="py-3 px-4 text-devoc-text-secondary font-mono text-[11px]">
                        {new Date(item.reviewedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/reviewer/reviews/${item.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View Context <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-devoc-text-tertiary space-y-2">
              <Clock className="h-8 w-8 mx-auto stroke-1" />
              <p className="text-xs font-medium text-devoc-text-secondary">No review history matches your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
