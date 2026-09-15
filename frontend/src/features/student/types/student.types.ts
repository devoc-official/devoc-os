import {
  EnrollmentMilestone,
  LearningActivity,
  LearningEnrollment,
  LearningProgram,
  LearningReview,
  Assessment,
  AssessmentAttempt,
} from '../../../api/learning.api';
import { Person } from '../../../api/people.api';
import { Project, Task } from '../../../api/projects.api';
import { Assignment } from '../../../api/assignments.api';

export type SuggestionStatus = 'open' | 'in_progress' | 'completed' | 'accepted' | 'deferred' | 'superseded';

export interface StudentSuggestion {
  id: string;
  text: string;
  status: SuggestionStatus;
  sourceType: 'review' | 'evaluation' | 'mentor';
  sourceId: string;
  reviewerName: string;
  relatedActivityId?: string | null;
  relatedActivityTitle?: string | null;
  requiredAction: string;
  evidence?: string | null;
  createdAt: string;
}

export interface StudentAttentionItem {
  id: string;
  type: 'suggestion' | 'review' | 'activity' | 'assessment' | 'milestone';
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  href: string;
  badgeLabel?: string;
}

export interface StudentUpcomingItem {
  id: string;
  type: 'review' | 'assessment' | 'activity' | 'meeting';
  title: string;
  subtitle: string;
  date: string;
  href: string;
}

export interface StudentProgressMetrics {
  programProgressPercent: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  activitiesCompleted: number;
  activitiesTotal: number;
  assessmentsTaken: number;
  assessmentsPassed: number;
  projectsCount: number;
  reviewsCount: number;
  latestReviewProgress?: number | null;
}

export interface StudentAchievement {
  id: string;
  title: string;
  description: string;
  category: 'milestone' | 'assessment' | 'project' | 'program';
  achievedAt: string;
  badgeCode: string;
  evidenceReference?: string;
}

export interface StudentContextData {
  enrollments: LearningEnrollment[];
  activeEnrollment: LearningEnrollment | null;
  activeProgram: LearningProgram | null;
  milestones: EnrollmentMilestone[];
  currentMilestone: EnrollmentMilestone | null;
  activities: LearningActivity[];
  currentActivity: LearningActivity | null;
  nextActivity: LearningActivity | null;
  mentorAssignment: Assignment | null;
  mentorPerson: Person | null;
  reviews: LearningReview[];
  assessments: Assessment[];
  attempts: AssessmentAttempt[];
  projects: Project[];
  tasks: Task[];
  suggestions: StudentSuggestion[];
  attentionItems: StudentAttentionItem[];
  upcomingItems: StudentUpcomingItem[];
  metrics: StudentProgressMetrics;
  achievements: StudentAchievement[];
  isLoading: boolean;
  isError: boolean;
  refetchAll: () => Promise<void>;
}
