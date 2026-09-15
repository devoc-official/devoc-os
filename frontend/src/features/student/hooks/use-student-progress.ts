'use client';

import { useMemo } from 'react';
import { useRoadmap } from './use-roadmap';
import { useAssessments } from './use-assessments';
import { useReviews } from './use-reviews';
import { useStudentProjects } from './use-student-projects';
import { StudentProgressMetrics } from '../types/student.types';

export function useStudentProgress() {
  const roadmap = useRoadmap();
  const assessments = useAssessments(roadmap.activeEnrollment?.id);
  const reviews = useReviews(roadmap.activeEnrollment?.id);
  const projects = useStudentProjects();

  const metrics = useMemo<StudentProgressMetrics>(() => {
    const totalActivities = roadmap.activities.length;
    const completedActivities = roadmap.completedActivitiesCount;
    const totalMilestones = roadmap.milestones.length;
    const completedMilestones = roadmap.completedMilestonesCount;

    const attempts = assessments.attempts;
    const passedAttempts = attempts.filter((a) => a.passed === true);

    const latestReview = reviews.reviews[0];

    const percent =
      totalActivities > 0
        ? Math.round((completedActivities / totalActivities) * 100)
        : totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    return {
      programProgressPercent: percent,
      milestonesCompleted: completedMilestones,
      milestonesTotal: totalMilestones,
      activitiesCompleted: completedActivities,
      activitiesTotal: totalActivities,
      assessmentsTaken: attempts.length,
      assessmentsPassed: passedAttempts.length,
      projectsCount: projects.projects.length,
      reviewsCount: reviews.reviews.length,
      latestReviewProgress: latestReview?.progressValue ?? null,
    };
  }, [
    roadmap.activities.length,
    roadmap.completedActivitiesCount,
    roadmap.milestones.length,
    roadmap.completedMilestonesCount,
    assessments.attempts,
    reviews.reviews,
    projects.projects.length,
  ]);

  return {
    metrics,
    isLoading: roadmap.isLoading || assessments.isLoading || reviews.isLoading || projects.isLoading,
  };
}
