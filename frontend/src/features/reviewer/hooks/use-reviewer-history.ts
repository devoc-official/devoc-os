'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, LearningEnrollment, LearningProgram, LearningReview } from '../../../api/learning.api';
import { peopleApi, Person } from '../../../api/people.api';

export interface ReviewHistoryItem extends LearningReview {
  studentName: string;
  studentEmail: string;
  programName: string;
  decision?: string;
}

export function useReviewerHistory() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDecision, setSelectedDecision] = useState<string>('all');

  const {
    data: allReviews = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['reviewer', 'history', orgId],
    queryFn: async (): Promise<ReviewHistoryItem[]> => {
      if (!orgId) return [];

      const [people, enrollments, programs] = await Promise.all([
        peopleApi.listPeople(orgId).catch(() => [] as Person[]),
        learningApi.listEnrollments(orgId).catch(() => [] as LearningEnrollment[]),
        learningApi.listPrograms(orgId).catch(() => [] as LearningProgram[]),
      ]);

      const historyItems: ReviewHistoryItem[] = [];

      for (const enr of enrollments) {
        const student = people.find((p) => p.id === enr.personId);
        const program = programs.find((pr) => pr.id === enr.learningProgramId);
        if (!student) continue;

        const revs = await learningApi.listReviews(orgId, enr.id).catch(() => []);
        revs.forEach((r) => {
          historyItems.push({
            ...r,
            studentName: `${student.firstName} ${student.lastName}`,
            studentEmail: student.email,
            programName: program?.name || 'Full-Stack Software Engineering',
            decision: (r.metadata as any)?.decision || 'continue',
          });
        });
      }

      return historyItems.sort(
        (a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
      );
    },
    enabled: Boolean(orgId),
  });

  const filteredHistory = useMemo(() => {
    return allReviews.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDecision = selectedDecision === 'all' || item.decision?.toLowerCase() === selectedDecision.toLowerCase();

      return matchesSearch && matchesDecision;
    });
  }, [allReviews, searchQuery, selectedDecision]);

  return {
    history: filteredHistory,
    totalCount: allReviews.length,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedDecision,
    setSelectedDecision,
    refetch,
  };
}
