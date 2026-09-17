export interface CreateOnboardingPlanDto {
  organizationId: string;
  employmentId: string;
  personId: string;
  templateId?: string | null;
  status?: string;
  targetCompletionDate?: string | Date;
  initiatedBy: string; // actor user id
  notes?: string | null;
}
