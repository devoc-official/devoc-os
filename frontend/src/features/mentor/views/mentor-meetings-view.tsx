'use client';

import React from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { useMentorMeetings } from '../hooks/use-mentor-meetings';

export function MentorMeetingsView() {
  const { meetings, upcomingMeetings, pastMeetings, isLoading } = useMentorMeetings();

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
          Mentor Sessions & Sync Meetings
        </h1>
        <p className="text-xs sm:text-sm text-devoc-text-secondary mt-1">
          Scheduled 1:1 sessions, milestone review calls, and technical alignment meetings powered by M6 Meetings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <Card className="border-devoc-border bg-devoc-surface">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
              <Calendar className="h-4 w-4 text-devoc-brand" />
              Upcoming Sessions ({upcomingMeetings.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Scheduled mentorship calls and milestone checkpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {upcomingMeetings.length > 0 ? (
              <div className="space-y-3">
                {upcomingMeetings.map((m) => (
                  <div key={m.id} className="p-3 rounded-md border border-devoc-border/70 bg-devoc-surface-hover/30 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-devoc-text-primary">{m.title}</span>
                      <Badge variant="brand" size="sm" className="capitalize text-[10px]">
                        {m.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-devoc-text-secondary font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(m.scheduledStartAt).toLocaleString()}
                      </span>
                      {m.locationReference && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {m.locationReference}
                        </span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-devoc-text-secondary text-[11px]">{m.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-devoc-text-tertiary">
                <p className="text-xs">No upcoming sessions scheduled.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Sessions */}
        <Card className="border-devoc-border bg-devoc-surface">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm font-semibold text-devoc-text-primary flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Past Completed Sessions ({pastMeetings.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Finalized review syncs with recorded minutes and decisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {pastMeetings.length > 0 ? (
              <div className="space-y-3">
                {pastMeetings.map((m) => (
                  <div key={m.id} className="p-3 rounded-md border border-devoc-border/60 bg-devoc-surface text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-devoc-text-primary">{m.title}</span>
                      <span className="text-[10px] font-mono text-devoc-text-tertiary">
                        {new Date(m.scheduledStartAt).toLocaleDateString()}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-devoc-text-secondary text-[11px]">{m.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-devoc-text-tertiary">
                <p className="text-xs">No past sessions recorded yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
