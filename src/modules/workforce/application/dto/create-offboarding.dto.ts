export interface CreateOffboardingDto {
  organizationId: string;
  employmentId: string;
  personId: string;
  exitReason: string; // could be enum of ExitReason
  status?: string; // optional initial status
  exitDate: string; // ISO date string
  notes?: string | null;
  initiatedBy: string; // actor user id
}
