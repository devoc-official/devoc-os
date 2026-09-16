'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { assignmentsApi } from '../../../api/assignments.api';
import { learningApi, LearningEnrollment, LearningProgram } from '../../../api/learning.api';
import { peopleApi, Person } from '../../../api/people.api';
import { MentorAttentionItem, MentorMetrics, MentorStudentItem } from '../types/mentor.types';

export function useMentorStudents() {
  const { activeOrganization, user } = useAuth();
  const orgId = activeOrganization?.organizationId;

  // 1. Resolve Mentor Person
  const { data: mentorPerson = null, isLoading: isPersonLoading } = useQuery({
    queryKey: ['mentor', 'person', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return null;
      const people = await peopleApi.listPeople(orgId);
      return people.find((p) => p.userId === user.id || p.email.toLowerCase() === user.email.toLowerCase()) || null;
    },
    enabled: Boolean(orgId && user),
  });

  // 2. Resolve M3 Mentorship Assignments & All Enrolled Students in Org
  const {
    data: rawData = { students: [], attentionItems: [], metrics: { assignedStudentsCount: 0, activeStudentsCount: 0, reviewsCompletedCount: 0, pendingReviewsCount: 0, unresolvedSuggestionsCount: 0 } },
    isLoading: isDataLoading,
    refetch,
  } = useQuery({
    queryKey: ['mentor', 'students-data', orgId, mentorPerson?.id],
    queryFn: async (): Promise<{
      students: MentorStudentItem[];
      attentionItems: MentorAttentionItem[];
      metrics: MentorMetrics;
    }> => {
      if (!orgId) {
        return {
          students: [],
          attentionItems: [],
          metrics: {
            assignedStudentsCount: 0,
            activeStudentsCount: 0,
            reviewsCompletedCount: 0,
            pendingReviewsCount: 0,
            unresolvedSuggestionsCount: 0,
          },
        };
      }

      // Fetch all people, assignments, programs, and enrollments
      const [allPeople, assignments, enrollments, programs] = await Promise.all([
        peopleApi.listPeople(orgId).catch(() => [] as Person[]),
        mentorPerson ? assignmentsApi.getPersonAssignments(orgId, mentorPerson.id).catch(() => []) : Promise.resolve([]),
        learningApi.listEnrollments(orgId).catch(() => [] as LearningEnrollment[]),
        learningApi.listPrograms(orgId).catch(() => [] as LearningProgram[]),
      ]);

      // Identify student person IDs assigned to this mentor
      const assignedTargetIds = new Set<string>();
      assignments.forEach((a) => {
        if (a.targetType === 'student' || a.roleContext?.toLowerCase().includes('mentor')) {
          assignedTargetIds.add(a.targetId);
        }
      });

      // Filter enrollments: either explicitly assigned or fallback to active academy enrollments for the mentor workspace
      const relevantEnrollments = enrollments.filter((e) => {
        if (assignedTargetIds.size > 0) {
          return assignedTargetIds.has(e.personId);
        }
        // Fallback: exclude the mentor themselves
        return mentorPerson ? e.personId !== mentorPerson.id : true;
      });

      const studentItems: MentorStudentItem[] = [];
      const attentionItems: MentorAttentionItem[] = [];
      let totalCompletedReviews = 0;
      let totalPendingReviews = 0;
      let totalUnresolvedSuggestions = 0;

      // Enhance each enrollment with student profile, current milestone, and review state
      for (const enr of relevantEnrollments) {
        const student = allPeople.find((p) => p.id === enr.personId);
        const program = programs.find((pr) => pr.id === enr.learningProgramId);
        if (!student) continue;

        // Fetch milestones and reviews for this enrollment
        const [milestones, reviews] = await Promise.all([
          learningApi.listEnrollmentMilestones(orgId, enr.id).catch(() => []),
          learningApi.listReviews(orgId, enr.id).catch(() => []),
        ]);

        const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
        const currentMilestone = milestones.find((m) => m.status === 'active') || milestones[0];
        const progressPercent = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;
        const lastReview = reviews[0] || null;

        totalCompletedReviews += reviews.length;

        // Evaluate Attention State
        let attentionUrgency: MentorStudentItem['attentionUrgency'] = 'none';
        let attentionReason: string | undefined;

        if (reviews.length === 0 && enr.status === 'active') {
          attentionUrgency = 'high';
          attentionReason = 'Awaiting initial mentor review';
          totalPendingReviews++;
          attentionItems.push({
            id: `att-review-${enr.id}`,
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            type: 'awaiting_review',
            title: 'Initial review required',
            description: `${student.firstName} is enrolled in ${program?.name || 'curriculum'} and has not had a review session.`,
            urgency: 'high',
            href: `/mentor/students/${student.id}`,
          });
        } else if (lastReview) {
          const daysSinceReview = Math.floor(
            (Date.now() - new Date(lastReview.reviewedAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceReview > 14) {
            attentionUrgency = 'medium';
            attentionReason = `Review due (${daysSinceReview} days since last sync)`;
            totalPendingReviews++;
            attentionItems.push({
              id: `att-overdue-${enr.id}`,
              studentId: student.id,
              studentName: `${student.firstName} ${student.lastName}`,
              type: 'overdue_followup',
              title: 'Bi-weekly review follow-up due',
              description: `Last review was conducted ${daysSinceReview} days ago.`,
              urgency: 'medium',
              href: `/mentor/students/${student.id}`,
            });
          }
        }

        studentItems.push({
          personId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          email: student.email,
          enrollmentId: enr.id,
          programId: program?.id || enr.learningProgramId,
          programName: program?.name || 'Full-Stack Software Engineering',
          currentMilestoneTitle: currentMilestone?.title || 'Core Foundations',
          currentMilestoneId: currentMilestone?.id,
          currentActivityTitle: 'Milestone Deliverables',
          progressPercent,
          lastReviewDate: lastReview?.reviewedAt || null,
          lastReviewDecision: (lastReview?.metadata as any)?.decision || null,
          openSuggestionsCount: 0,
          attentionUrgency,
          attentionReason,
          status: enr.status as any,
        });
      }

      return {
        students: studentItems,
        attentionItems,
        metrics: {
          assignedStudentsCount: studentItems.length,
          activeStudentsCount: studentItems.filter((s) => s.status === 'active').length,
          reviewsCompletedCount: totalCompletedReviews,
          pendingReviewsCount: totalPendingReviews,
          unresolvedSuggestionsCount: totalUnresolvedSuggestions,
        },
      };
    },
    enabled: Boolean(orgId),
  });

  return {
    mentorPerson,
    students: rawData.students,
    attentionItems: rawData.attentionItems,
    metrics: rawData.metrics,
    isLoading: isPersonLoading || isDataLoading,
    refetch,
  };
}
