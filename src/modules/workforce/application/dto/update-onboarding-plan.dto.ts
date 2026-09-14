export interface UpdateOnboardingPlanDto {
  organizationId: string;
  planId: string;
  status?: string; // e.g., 'initiated', 'completed'
  updatedBy: string; // actor user id
  notes?: string | null;
}
