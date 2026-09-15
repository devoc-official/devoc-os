'use client';

import { useMemo } from 'react';
import { useEnrollment } from './use-enrollment';
import { EnrollmentMilestone, LearningActivity } from '../../../api/learning.api';

export interface MilestoneWithActivities extends EnrollmentMilestone {
  activities: LearningActivity[];
  progressPercent: number;
}

export function useRoadmap() {
  const {
    enrollments,
    activeEnrollment,
    historicalEnrollments,
    activeProgram,
    milestones,
    activities,
    isLoading,
    isError,
    completeActivity,
    skipActivity,
    refetchAll,
  } = useEnrollment();

  const currentMilestone = useMemo(() => {
    if (!milestones.length) return null;
    return (
      milestones.find((m) => m.status === 'active') ||
      milestones.find((m) => m.status === 'pending') ||
      milestones[milestones.length - 1]
    );
  }, [milestones]);

  const milestonesWithActivities = useMemo<MilestoneWithActivities[]>(() => {
    return milestones.map((m) => {
      const mActivities = activities.filter((a) => a.enrollmentMilestoneId === m.id);
      const completedCount = mActivities.filter((a) => a.status === 'completed').length;
      const progress = mActivities.length > 0 ? Math.round((completedCount / mActivities.length) * 100) : m.status === 'completed' ? 100 : 0;
      return {
        ...m,
        activities: mActivities,
        progressPercent: progress,
      };
    });
  }, [milestones, activities]);

  const currentActivity = useMemo(() => {
    if (!activities.length) return null;
    if (currentMilestone) {
      const milestoneActivities = activities.filter(
        (a) => a.enrollmentMilestoneId === currentMilestone.id
      );
      const activeOrPending =
        milestoneActivities.find((a) => a.status === 'active') ||
        milestoneActivities.find((a) => a.status === 'pending');
      if (activeOrPending) return activeOrPending;
    }
    return (
      activities.find((a) => a.status === 'active') ||
      activities.find((a) => a.status === 'pending') ||
      null
    );
  }, [activities, currentMilestone]);

  const nextActivity = useMemo(() => {
    if (!currentActivity || !activities.length) return null;
    const currentIndex = activities.findIndex((a) => a.id === currentActivity.id);
    if (currentIndex >= 0 && currentIndex < activities.length - 1) {
      return activities[currentIndex + 1];
    }
    return null;
  }, [activities, currentActivity]);

  const completedMilestonesCount = useMemo(
    () => milestones.filter((m) => m.status === 'completed').length,
    [milestones]
  );

  const completedActivitiesCount = useMemo(
    () => activities.filter((a) => a.status === 'completed').length,
    [activities]
  );

  const overallProgressPercent = useMemo(() => {
    if (!activities.length) {
      if (!milestones.length) return 0;
      return Math.round((completedMilestonesCount / milestones.length) * 100);
    }
    return Math.round((completedActivitiesCount / activities.length) * 100);
  }, [activities.length, completedActivitiesCount, milestones.length, completedMilestonesCount]);

  return {
    enrollments,
    activeEnrollment,
    historicalEnrollments,
    activeProgram,
    milestones,
    activities,
    currentMilestone,
    currentActivity,
    nextActivity,
    milestonesWithActivities,
    completedMilestonesCount,
    totalMilestonesCount: milestones.length,
    completedActivitiesCount,
    totalActivitiesCount: activities.length,
    overallProgressPercent,
    isLoading,
    isError,
    completeActivity,
    skipActivity,
    refetchAll,
  };
}
