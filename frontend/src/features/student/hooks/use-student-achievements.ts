'use client';

import { useMemo } from 'react';
import { useRoadmap } from './use-roadmap';
import { useAssessments } from './use-assessments';
import { useStudentProjects } from './use-student-projects';
import { StudentAchievement } from '../types/student.types';

export function useStudentAchievements() {
  const roadmap = useRoadmap();
  const assessments = useAssessments(roadmap.activeEnrollment?.id);
  const projects = useStudentProjects();

  const achievements = useMemo<StudentAchievement[]>(() => {
    const list: StudentAchievement[] = [];

    // 1. Program Completion
    if (roadmap.activeEnrollment?.status === 'completed' && roadmap.activeProgram) {
      list.push({
        id: `prog-${roadmap.activeEnrollment.id}`,
        title: `${roadmap.activeProgram.name} Graduate`,
        description: 'Successfully completed all curriculum requirements, milestones, and reviewer approvals.',
        category: 'program',
        achievedAt: roadmap.activeEnrollment.completedAt || roadmap.activeEnrollment.updatedAt,
        badgeCode: 'PROGRAM_GRADUATION',
        evidenceReference: roadmap.activeProgram.code,
      });
    }

    // 2. Completed Milestones
    roadmap.milestones
      .filter((m) => m.status === 'completed')
      .forEach((m) => {
        list.push({
          id: `ms-${m.id}`,
          title: `Milestone Mastery: ${m.title}`,
          description: m.description || `Demonstrated competency across all milestone learning activities.`,
          category: 'milestone',
          achievedAt: m.completedAt || m.updatedAt,
          badgeCode: `MILESTONE_COMPLETE_${m.sequence}`,
          evidenceReference: `Seq ${m.sequence}`,
        });
      });

    // 3. Passed Assessments
    assessments.assessments.forEach((assessment) => {
      const passedAttempt = assessments.attempts.find(
        (att) => att.assessmentId === assessment.id && att.passed === true
      );
      if (passedAttempt) {
        list.push({
          id: `ass-${passedAttempt.id}`,
          title: `Certified: ${assessment.title}`,
          description: `Passed evaluation with score ${passedAttempt.score ?? 100}/${assessment.maxScore}.`,
          category: 'assessment',
          achievedAt: passedAttempt.completedAt || passedAttempt.submittedAt,
          badgeCode: 'ASSESSMENT_CERTIFIED',
          evidenceReference: `Score: ${passedAttempt.score ?? 100}/${assessment.maxScore}`,
        });
      }
    });

    // 4. Completed Projects
    projects.projects
      .filter((p) => p.status === 'released' || p.status === 'maintenance')
      .forEach((p) => {
        list.push({
          id: `proj-${p.id}`,
          title: `Shipped: ${p.name}`,
          description: p.description || `Successfully contributed and released project deliverable.`,
          category: 'project',
          achievedAt: p.updatedAt,
          badgeCode: 'PROJECT_SHIPPED',
          evidenceReference: p.code,
        });
      });

    return list.sort(
      (a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime()
    );
  }, [
    roadmap.activeEnrollment,
    roadmap.activeProgram,
    roadmap.milestones,
    assessments.assessments,
    assessments.attempts,
    projects.projects,
  ]);

  return {
    achievements,
    isLoading: roadmap.isLoading || assessments.isLoading || projects.isLoading,
  };
}
