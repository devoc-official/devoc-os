'use client';

import React, { useState } from 'react';
import { useEmployeeMeetings } from '../hooks/use-employee-meetings';
import { Meeting, MeetingActionItem, MeetingDecision } from '../../../api/meetings.api';
import { StatusBadge } from '../../../components/data/status-badge';
import { Calendar, Clock, MapPin, CheckSquare, FileText, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

export function EmployeeMeetingsView() {
  const { upcomingMeetings, pastMeetings, isLoading, getMeetingDetails } = useEmployeeMeetings();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [details, setDetails] = useState<{ decisions: MeetingDecision[]; actionItems: MeetingActionItem[] }>({
    decisions: [],
    actionItems: [],
  });

  const handleSelectMeeting = async (m: Meeting) => {
    setSelectedMeeting(m);
    const d = await getMeetingDetails(m.id);
    setDetails(d);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-devoc-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-devoc-text-primary">
          Meetings
        </h1>
        <p className="text-xs text-devoc-text-secondary mt-1">
          Operational team meetings, agendas, documented decisions, and action items linked to tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming & Past Meetings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
              Upcoming Scheduled Meetings ({upcomingMeetings.length})
            </h3>

            {upcomingMeetings.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingMeetings.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMeeting(m)}
                    className={cn(
                      'p-4 rounded-md border cursor-pointer transition-colors space-y-2',
                      selectedMeeting?.id === m.id
                        ? 'border-devoc-accent bg-devoc-surface-secondary/70'
                        : 'border-devoc-border bg-devoc-surface hover:bg-devoc-surface-secondary/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm text-devoc-text-primary">{m.title}</h4>
                        {m.description && (
                          <p className="text-xs text-devoc-text-secondary mt-0.5 line-clamp-2">
                            {m.description}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-devoc-text-muted pt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-devoc-accent" />
                        {new Date(m.scheduledStartAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5 text-devoc-accent" />
                        {new Date(m.scheduledStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' — '}
                        {new Date(m.scheduledEndAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-devoc-text-muted border border-dashed border-devoc-border rounded-md">
                No upcoming meetings scheduled.
              </div>
            )}
          </div>

          {/* Past Meetings */}
          {pastMeetings.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-devoc-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
                Completed Meetings Archive ({pastMeetings.length})
              </h3>
              <div className="space-y-2">
                {pastMeetings.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMeeting(m)}
                    className={cn(
                      'p-3 rounded-md border cursor-pointer text-xs flex items-center justify-between transition-colors',
                      selectedMeeting?.id === m.id
                        ? 'border-devoc-accent bg-devoc-surface-secondary/70'
                        : 'border-devoc-border bg-devoc-surface hover:bg-devoc-surface-secondary/40'
                    )}
                  >
                    <div>
                      <span className="font-medium text-devoc-text-primary">{m.title}</span>
                      <span className="text-devoc-text-muted text-[11px] block font-mono">
                        {new Date(m.scheduledStartAt).toLocaleDateString()}
                      </span>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Details Panel */}
        <div className="space-y-4">
          <div className="p-4 rounded-md border border-devoc-border bg-devoc-surface space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-devoc-text-secondary">
              Meeting Overview & Minutes
            </h3>

            {selectedMeeting ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-sm text-devoc-text-primary">{selectedMeeting.title}</h4>
                  <p className="text-devoc-text-secondary mt-1 whitespace-pre-wrap">
                    {selectedMeeting.description || 'No detailed agenda provided.'}
                  </p>
                </div>

                {/* Decisions */}
                <div className="space-y-2 pt-2 border-t border-devoc-border">
                  <span className="text-[11px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
                    <FileText className="h-3 w-3 text-devoc-accent" />
                    Documented Decisions ({details.decisions.length})
                  </span>
                  {details.decisions.length > 0 ? (
                    <ul className="space-y-1.5">
                      {details.decisions.map((d) => (
                        <li key={d.id} className="p-2 rounded bg-devoc-surface-secondary/50 border border-devoc-border text-xs">
                          <span className="font-semibold block">{d.title}</span>
                          <span className="text-devoc-text-secondary text-[11px]">{d.decisionText}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-devoc-text-muted italic">No formal decisions recorded.</p>
                  )}
                </div>

                {/* Action Items */}
                <div className="space-y-2 pt-2 border-t border-devoc-border">
                  <span className="text-[11px] uppercase font-semibold text-devoc-text-muted flex items-center gap-1">
                    <CheckSquare className="h-3 w-3 text-devoc-accent" />
                    Action Items ({details.actionItems.length})
                  </span>
                  {details.actionItems.length > 0 ? (
                    <ul className="space-y-1.5">
                      {details.actionItems.map((a) => (
                        <li key={a.id} className="p-2 rounded bg-devoc-surface-secondary/50 border border-devoc-border text-xs flex items-center justify-between">
                          <div>
                            <span className="font-medium text-devoc-text-primary">{a.title}</span>
                            {a.taskId && (
                              <span className="text-[10px] font-mono text-devoc-accent block">
                                Linked Task: #{a.taskId.slice(0, 6)}
                              </span>
                            )}
                          </div>
                          <StatusBadge status={a.status} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-devoc-text-muted italic">No action items linked.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-devoc-text-muted">
                Select any meeting to inspect agendas, decisions, and action items.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
