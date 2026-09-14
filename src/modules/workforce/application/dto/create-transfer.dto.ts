export interface CreateTransferDto {
  organizationId: string;
  employmentId: string;
  personId: string;
  sourceBusinessUnitId?: string | null;
  targetBusinessUnitId?: string | null;
  sourceDepartmentId?: string | null;
  targetDepartmentId?: string | null;
  sourceTeamId?: string | null;
  targetTeamId?: string | null;
  sourceManagerId?: string | null;
  targetManagerId?: string | null;
  reason?: string | null;
  effectiveDate: string; // ISO date string
  initiatedBy: string; // actor user id
}
