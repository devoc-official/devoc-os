export interface ApprovePromotionDto {
  organizationId: string;
  promotionId: string;
  approvedBy: string; // user id
  status: 'approved' | 'rejected';
  notes?: string | null;
}
