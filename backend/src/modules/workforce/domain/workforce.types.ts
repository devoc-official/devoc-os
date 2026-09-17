export type OnboardingPlanStatus = 'draft' | 'initiated' | 'in_progress' | 'completed' | 'cancelled';

export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export type OnboardingItemType =
  | 'document_reference'
  | 'policy_acknowledgement'
  | 'equipment_receipt'
  | 'access_confirmation'
  | 'compliance_verification'
  | 'other';

export type OnboardingItemStatus = 'pending' | 'submitted' | 'verified' | 'rejected' | 'skipped';

export type MovementStatus =
  | 'draft'
  | 'submitted'
  | 'pending_review'
  | 'pending_approval'
  | 'approved'
  | 'executed'
  | 'rejected'
  | 'cancelled';

export type ExitReason = 'resignation' | 'termination' | 'contract_end' | 'retirement' | 'other';

export type OffboardingStatus = 'initiated' | 'clearance_in_progress' | 'cleared' | 'completed' | 'cancelled';

export type ClearanceType =
  | 'it_access'
  | 'equipment_return'
  | 'financial_settlement'
  | 'knowledge_handover'
  | 'other';

export type ClearanceStatus = 'pending' | 'cleared' | 'waived';

export interface OnboardingTemplate {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingTemplateTask {
  id: string;
  organizationId: string;
  templateId: string;
  title: string;
  description: string | null;
  assignedRoleContext: string | null;
  dueOffsetDays: number;
  isMandatory: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingTemplateItem {
  id: string;
  organizationId: string;
  templateId: string;
  templateTaskId: string | null;
  itemType: OnboardingItemType;
  title: string;
  description: string | null;
  isRequired: boolean;
  sequenceOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingPlan {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  templateId: string | null;
  status: OnboardingPlanStatus;
  initiatedAt: Date | null;
  targetCompletionDate: Date | null;
  actualCompletionDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingTask {
  id: string;
  organizationId: string;
  planId: string;
  templateTaskId: string | null;
  title: string;
  description: string | null;
  assignedRoleContext: string | null;
  status: OnboardingTaskStatus;
  isMandatory: boolean;
  displayOrder: number;
  dueDate: Date | null;
  completedAt: Date | null;
  meetingId: string | null;
  learningProgramId: string | null;
  evaluationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingItem {
  id: string;
  organizationId: string;
  planId: string;
  taskId: string | null;
  templateItemId: string | null;
  itemType: OnboardingItemType;
  title: string;
  status: OnboardingItemStatus;
  itemMetadata: Record<string, unknown>;
  verifiedByPersonId: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkforceTransfer {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  sourceBusinessUnitId: string | null;
  targetBusinessUnitId: string | null;
  sourceDepartmentId: string | null;
  targetDepartmentId: string | null;
  sourceTeamId: string | null;
  targetTeamId: string | null;
  sourceManagerId: string | null;
  targetManagerId: string | null;
  status: MovementStatus;
  reason: string | null;
  effectiveDate: Date;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  approvedAt: Date | null;
  approvedByPersonId: string | null;
  executedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkforcePromotion {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  sourceJobTitle: string;
  targetJobTitle: string;
  sourcePersonRoleId: string | null;
  targetPersonRoleId: string | null;
  status: MovementStatus;
  reason: string | null;
  effectiveDate: Date;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  approvedAt: Date | null;
  approvedByPersonId: string | null;
  executedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkforceOffboarding {
  id: string;
  organizationId: string;
  employmentId: string;
  personId: string;
  exitReason: ExitReason;
  status: OffboardingStatus;
  exitDate: Date;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkforceOffboardingClearance {
  id: string;
  organizationId: string;
  offboardingId: string;
  clearanceType: ClearanceType;
  departmentId: string | null;
  verifierPersonId: string | null;
  financialObligationId: string | null;
  status: ClearanceStatus;
  notes: string | null;
  clearedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
