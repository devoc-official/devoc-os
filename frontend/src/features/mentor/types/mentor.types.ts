import { EnrollmentMilestone, LearningActivity, LearningEnrollment, LearningReview } from '../../../api/learning.api';
import { Person } from '../../../api/people.api';
import { StudentSuggestion } from '../../student/types/student.types';

export interface MentorStudentItem {
  personId: string;
  studentName: string;
  email: string;
  enrollmentId: string;
  programId: string;
  programName: string;
  currentMilestoneTitle: string;
  currentMilestoneId?: string;
  currentActivityTitle: string;
  progressPercent: number;
  lastReviewDate?: string | null;
  lastReviewDecision?: string | null;
  openSuggestionsCount: number;
  attentionUrgency: 'high' | 'medium' | 'low' | 'none';
  attentionReason?: string;
  status: 'active' | 'paused' | 'completed' | 'withdrawn';
}

export interface MentorAttentionItem {
  id: string;
  studentId: string;
  studentName: string;
  type: 'awaiting_review' | 'overdue_followup' | 'stalled_milestone' | 'unresolved_suggestions';
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  href: string;
}

export interface MentorMetrics {
  assignedStudentsCount: number;
  activeStudentsCount: number;
  reviewsCompletedCount: number;
  pendingReviewsCount: number;
  unresolvedSuggestionsCount: number;
}
