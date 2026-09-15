'use client';

import { useMemo } from 'react';
import { useRoadmap } from './use-roadmap';
import { useAssessments } from './use-assessments';
import { useReviews } from './use-reviews';
import { useMentor } from './use-mentor';
import { useStudentProjects } from './use-student-projects';
import { useStudentProgress } from './use-student-progress';
import { useStudentAchievements } from './use-student-achievements';
import {
  StudentAttentionItem,
  StudentUpcomingItem,
  StudentContextData,
} from '../types/student.types';

export function useStudentData(): StudentContextData {
  const roadmap = useRoadmap();
  const assessments = useAssessments(roadmap.activeEnrollment?.id);
  const reviews = useReviews(roadmap.activeEnrollment?.id);
  const mentor = useMentor(roadmap.activeEnrollment?.id);
  const projects = useStudentProjects();
  const { metrics } = useStudentProgress();
  const { achievements } = useStudentAchievements();

  // 1. Attention Items (Open suggestions, pending assessments, etc.)
  const attentionItems = useMemo<StudentAttentionItem[]>(() => {
    const items: StudentAttentionItem[] = [];

    // Open suggestions
    reviews.suggestions
      .filter((s) => s.status === 'open' || s.status === 'in_progress')
      .slice(0, 3)
      .forEach((s) => {
        items.push({
          id: `att-sug-${s.id}`,
          type: 'suggestion',
          title: `Address Mentor Feedback: ${s.requiredAction}`,
          description: s.text,
          urgency: 'high',
          href: '/learning/feedback',
          badgeLabel: 'Feedback Required',
        });
      });

    // Unattempted or pending assessments
    assessments.assessments.forEach((a) => {
      const hasAttempt = assessments.attempts.some((att) => att.assessmentId === a.id);
      if (!hasAttempt) {
        items.push({
          id: `att-ass-${a.id}`,
          type: 'assessment',
          title: `Assessment Pending: ${a.title}`,
          description: a.description || 'Complete required milestone knowledge check.',
          urgency: 'medium',
          href: '/learning/assessments',
          badgeLabel: 'Assessment Due',
        });
      }
    });

    // Current activity if pending or active
    if (roadmap.currentActivity && roadmap.currentActivity.status !== 'completed') {
      items.push({
        id: `att-act-${roadmap.currentActivity.id}`,
        type: 'activity',
        title: `Continue Learning: ${roadmap.currentActivity.title}`,
        description: roadmap.currentActivity.description || 'Active milestone deliverable.',
        urgency: 'medium',
        href: `/learning/activities/${roadmap.currentActivity.id}`,
        badgeLabel: 'Current Activity',
      });
    }

    return items;
  }, [reviews.suggestions, assessments.assessments, assessments.attempts, roadmap.currentActivity]);

  // 2. Upcoming Items (Upcoming reviews, assessments, next milestones)
  const upcomingItems = useMemo<StudentUpcomingItem[]>(() => {
    const items: StudentUpcomingItem[] = [];

    // Next scheduled review indicator
    if (reviews.reviews.length > 0) {
      const lastReview = reviews.reviews[0];
      const nextReviewDate = new Date(new Date(lastReview.reviewedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
      items.push({
        id: `up-review`,
        type: 'review',
        title: 'Weekly Mentorship Progress Sync',
        subtitle: `With ${mentor.mentorPerson?.firstName || 'Assigned Mentor'} (cadence: weekly)`,
        date: nextReviewDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        href: '/learning/mentor',
      });
    }

    // Next activity in pipeline
    if (roadmap.nextActivity) {
      items.push({
        id: `up-act-${roadmap.nextActivity.id}`,
        type: 'activity',
        title: `Upcoming Activity: ${roadmap.nextActivity.title}`,
        subtitle: `Sequence ${roadmap.nextActivity.sequence} • ${roadmap.nextActivity.activityType}`,
        date: 'Next up',
        href: `/learning/activities/${roadmap.nextActivity.id}`,
      });
    }

    // Future milestones
    roadmap.milestones
      .filter((m) => m.status === 'pending')
      .slice(0, 2)
      .forEach((m) => {
        items.push({
          id: `up-ms-${m.id}`,
          type: 'activity',
          title: `Milestone: ${m.title}`,
          subtitle: `Sequence ${m.sequence} in ${roadmap.activeProgram?.name || 'Program'}`,
          date: 'Upcoming',
          href: '/learning/roadmap',
        });
      });

    return items;
  }, [reviews.reviews, mentor.mentorPerson, roadmap.nextActivity, roadmap.milestones, roadmap.activeProgram]);

  const isLoading =
    roadmap.isLoading ||
    assessments.isLoading ||
    reviews.isLoading ||
    mentor.isLoading ||
    projects.isLoading;

  const isError = roadmap.isError || assessments.isError || reviews.isError;

  const refetchAll = async () => {
    await Promise.all([
      roadmap.refetchAll(),
      assessments.refetchAll(),
      reviews.refetchReviews(),
    ]);
  };

  return {
    enrollments: roadmap.enrollments,
    activeEnrollment: roadmap.activeEnrollment,
    activeProgram: roadmap.activeProgram,
    milestones: roadmap.milestones,
    currentMilestone: roadmap.currentMilestone,
    activities: roadmap.activities,
    currentActivity: roadmap.currentActivity,
    nextActivity: roadmap.nextActivity,
    mentorAssignment: mentor.mentorAssignment,
    mentorPerson: mentor.mentorPerson,
    reviews: reviews.reviews,
    assessments: assessments.assessments,
    attempts: assessments.attempts,
    projects: projects.projects,
    tasks: projects.projects.flatMap((p) => p.tasks),
    suggestions: reviews.suggestions,
    attentionItems,
    upcomingItems,
    metrics,
    achievements,
    isLoading,
    isError,
    refetchAll,
  };
}
