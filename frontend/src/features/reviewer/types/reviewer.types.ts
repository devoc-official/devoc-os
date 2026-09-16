import {
  Assessment,
  AssessmentAttempt,
  EnrollmentMilestone,
  LearningActivity,
  LearningEnrollment,
  LearningProgram,
  LearningReview,
  ReviewChange,
} from '../../../api/learning.api';
import { Person } from '../../../api/people.api';
import { Project, Task } from '../../../api/projects.api';
import { WorkRecord } from '../../../api/work.api';
import { StudentSuggestion } from '../../student/types/student.types';

export type ProgressionDecision = 'continue' | 'advance' | 'improve' | 'repeat';

export interface ReviewQueueItem {
  reviewId?: string;
  enrollmentId: string;
  studentPersonId: string;
  studentName: string;
  studentEmail: string;
  programName: string;
  currentMilestoneTitle: string;
  currentMilestoneId?: string;
  currentActivityTitle: string;
  lastReviewDate?: string | null;
  daysSinceLastReview: number;
  submissionStatus: 'submitted' | 'in_progress' | 'pending';
  attentionUrgency: 'high' | 'medium' | 'low';
  reviewType: string;
}

export interface ReviewWorkspaceContext {
  student: Person;
  enrollment: LearningEnrollment;
  program: LearningProgram;
  milestones: EnrollmentMilestone[];
  currentMilestone: EnrollmentMilestone | null;
  currentActivity: LearningActivity | null;
  previousReview: LearningReview | null;
  previousSuggestions: StudentSuggestion[];
  reviewChanges: ReviewChange[];
  currentEvidence: {
    projects: Project[];
    tasks: Task[];
    workRecords: WorkRecord[];
  };
  assessments: Assessment[];
  attempts: AssessmentAttempt[];
}

export interface ReviewerMetrics {
  queueCount: number;
  completedReviewsCount: number;
  pendingDecisionCount: number;
  studentsCount: number;
}
