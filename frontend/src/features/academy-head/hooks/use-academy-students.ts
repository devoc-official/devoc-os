'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/use-auth';
import { learningApi, LearningProgram, LearningEnrollment, LearningReview } from '../../../api/learning.api';
import { peopleApi, Person } from '../../../api/people.api';
import { assignmentsApi, Assignment } from '../../../api/assignments.api';

export interface OperationalStudentRow {
  student: Person;
  enrollment: LearningEnrollment;
  program: LearningProgram | null;
  mentorName: string | null;
  status: string;
  totalReviews: number;
  lastReviewDate: string | null;
  attentionTag?: 'normal' | 'stalled' | 'needs_review' | 'no_mentor';
}

export function useAcademyStudents() {
  const { activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId || '';

  const { data: people = [], isLoading: isPeopleLoading } = useQuery({
    queryKey: ['ah', 'people', orgId],
    queryFn: () => peopleApi.listPeople(orgId),
    enabled: Boolean(orgId),
  });

  const { data: programs = [], isLoading: isProgramsLoading } = useQuery({
    queryKey: ['ah', 'programs', orgId],
    queryFn: () => learningApi.listPrograms(orgId),
    enabled: Boolean(orgId),
  });

  const { data: enrollments = [], isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['ah', 'enrollments', orgId],
    queryFn: () => learningApi.listEnrollments(orgId),
    enabled: Boolean(orgId),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['ah', 'reviews', orgId],
    queryFn: () => learningApi.listReviews(orgId),
    enabled: Boolean(orgId),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['ah', 'assignments', orgId],
    queryFn: () => assignmentsApi.listAssignments(orgId),
    enabled: Boolean(orgId),
  });

  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const programMap = new Map(programs.map((p) => [p.id, p]));

  // Build mentor lookup map for student target
  const studentMentorMap = new Map<string, string>();
  for (const a of assignments) {
    if (a.targetType === 'student' && (a.roleContext?.toLowerCase().includes('mentor') || a.assignmentType === 'mentor')) {
      const mentorPerson = peopleMap.get(a.personId);
      if (mentorPerson) {
        studentMentorMap.set(a.targetId, `${mentorPerson.firstName} ${mentorPerson.lastName}`);
      }
    }
  }

  // Student reviews lookup by enrollmentId
  const enrollmentReviewsMap = new Map<string, LearningReview[]>();
  for (const r of reviews) {
    const list = enrollmentReviewsMap.get(r.enrollmentId) || [];
    list.push(r);
    enrollmentReviewsMap.set(r.enrollmentId, list);
  }

  const studentRows: OperationalStudentRow[] = [];

  for (const e of enrollments) {
    const person = peopleMap.get(e.personId);
    if (!person) continue;

    const program = programMap.get(e.learningProgramId) || null;
    const mentorName = studentMentorMap.get(e.personId) || null;
    const sReviews = enrollmentReviewsMap.get(e.id) || [];
    const lastReview = sReviews.length > 0 ? sReviews[sReviews.length - 1] : null;

    let attentionTag: 'normal' | 'stalled' | 'needs_review' | 'no_mentor' = 'normal';
    if (!mentorName && e.status === 'active') {
      attentionTag = 'no_mentor';
    } else if (e.status === 'paused') {
      attentionTag = 'stalled';
    } else if (sReviews.length === 0 && e.status === 'active') {
      attentionTag = 'needs_review';
    }

    studentRows.push({
      student: person,
      enrollment: e,
      program,
      mentorName,
      status: e.status,
      totalReviews: sReviews.length,
      lastReviewDate: lastReview ? lastReview.reviewedAt : null,
      attentionTag,
    });
  }

  return {
    studentRows,
    programs,
    isLoading: isPeopleLoading || isProgramsLoading || isEnrollmentsLoading,
  };
}
