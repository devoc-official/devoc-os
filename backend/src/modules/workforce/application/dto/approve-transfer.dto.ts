export interface ApproveTransferDto {
  organizationId: string;
  transferId: string;
  approvedBy: string; // user id
  status: 'approved' | 'rejected';
  notes?: string | null;
}
