export interface CompleteOffboardingDto {
  organizationId: string;
  offboardingId: string;
  completedBy?: string;
  notes?: string | null;
}
