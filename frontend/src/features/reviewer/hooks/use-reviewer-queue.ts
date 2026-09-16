'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, LearningEnrollment, LearningProgram } from '../../../api/learning.api';
import { peopleApi, Person } from '../../../api/people.api';
import { ReviewQueueItem, ReviewerMetrics } from '../types/reviewer.types';

export function useReviewerQueue() {
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.organizationId;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');

  // Resolve Reviewer Person
  const { data: reviewerPerson = null } = useQuery({
    queryKey: ['reviewer', 'person', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return null;
      const people = await peopleApi.listPeople(orgId);
      return people.find((p) => p.userId === user.id || p.email.toLowerCase() === user.email.toLowerCase()) || null;
    },
    enabled: Boolean(orgId && user),
  });

  const {
    data: rawData = { items: [], metrics: { queueCount: 0, completedReviewsCount: 0, pendingDecisionCount: 0, studentsCount: 0 } },
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['reviewer', 'queue-data', orgId],
    queryFn: async (): Promise<{ items: ReviewQueueItem[]; metrics: ReviewerMetrics }> => {
      if (!orgId) {
        return {
          items: [],
          metrics: { queueCount: 0, completedReviewsCount: 0, pendingDecisionCount: 0, studentsCount: 0 },
        };
      }

      const [people, enrollments, programs] = await Promise.all([
        peopleApi.listPeople(orgId).catch(() => [] as Person[]),
        learningApi.listEnrollments(orgId).catch(() => [] as LearningEnrollment[]),
        learningApi.listPrograms(orgId).catch(() => [] as LearningProgram[]),
      ]);

      const activeEnrollments = enrollments.filter((e) => e.status === 'active');
      const queueItems: ReviewQueueItem[] = [];
      let totalCompletedReviews = 0;
      let totalPendingDecision = 0;

      for (const enr of activeEnrollments) {
        const student = people.find((p) => p.id === enr.personId);
        const program = programs.find((pr) => pr.id === enr.learningProgramId);
        if (!student) continue;

        const [milestones, reviews] = await Promise.all([
          learningApi.listEnrollmentMilestones(orgId, enr.id).catch(() => []),
          learningApi.listReviews(orgId, enr.id).catch(() => []),
        ]);

        totalCompletedReviews += reviews.length;
        const currentMilestone = milestones.find((m) => m.status === 'active') || milestones[0];
        const lastReview = reviews[0] || null;

        let daysSinceLastReview = 0;
        let urgency: ReviewQueueItem['attentionUrgency'] = 'low';

        if (!lastReview) {
          urgency = 'high';
          daysSinceLastReview = Math.floor(
            (Date.now() - new Date(enr.enrolledAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          totalPendingDecision++;
        } else {
          daysSinceLastReview = Math.floor(
            (Date.now() - new Date(lastReview.reviewedAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastReview > 14) {
            urgency = 'high';
            totalPendingDecision++;
          } else if (daysSinceLastReview > 7) {
            urgency = 'medium';
            totalPendingDecision++;
          }
        }

        queueItems.push({
          reviewId: lastReview?.id,
          enrollmentId: enr.id,
          studentPersonId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          studentEmail: student.email,
          programName: program?.name || 'Full-Stack Software Engineering',
          currentMilestoneTitle: currentMilestone?.title || 'Foundations',
          currentMilestoneId: currentMilestone?.id,
          currentActivityTitle: 'Milestone Deliverables',
          lastReviewDate: lastReview?.reviewedAt || null,
          daysSinceLastReview,
          submissionStatus: 'submitted',
          attentionUrgency: urgency,
          reviewType: lastReview?.reviewType || 'weekly',
        });
      }

      // Sort queue by urgency (high first, then days since review)
      queueItems.sort((a, b) => {
        const urgencyScore = { high: 3, medium: 2, low: 1 };
        const diff = urgencyScore[b.attentionUrgency] - urgencyScore[a.attentionUrgency];
        if (diff !== 0) return diff;
        return b.daysSinceLastReview - a.daysSinceLastReview;
      });

      return {
        items: queueItems,
        metrics: {
          queueCount: queueItems.length,
          completedReviewsCount: totalCompletedReviews,
          pendingDecisionCount: totalPendingDecision,
          studentsCount: activeEnrollments.length,
        },
      };
    },
    enabled: Boolean(orgId),
  });

  const filteredQueue = useMemo(() => {
    return rawData.items.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.currentMilestoneTitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesUrgency = selectedUrgency === 'all' || item.attentionUrgency === selectedUrgency;
      const matchesProgram = selectedProgram === 'all' || item.programName === selectedProgram;

      return matchesSearch && matchesUrgency && matchesProgram;
    });
  }, [rawData.items, searchQuery, selectedUrgency, selectedProgram]);

  return {
    reviewerPerson,
    queue: filteredQueue,
    allQueue: rawData.items,
    metrics: rawData.metrics,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedUrgency,
    setSelectedUrgency,
    selectedProgram,
    setSelectedProgram,
    refetch,
  };
}
