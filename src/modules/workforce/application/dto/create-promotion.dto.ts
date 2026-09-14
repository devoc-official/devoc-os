export interface CreatePromotionDto {
  organizationId: string;
  employmentId: string;
  personId: string;
  sourceJobTitle: string;
  targetJobTitle: string;
  sourcePersonRoleId?: string | null;
  targetPersonRoleId?: string | null;
  reason?: string | null;
  effectiveDate: string; // ISO date
  initiatedBy: string; // actor user id
}
