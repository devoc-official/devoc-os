import { Request, Response } from 'express';
import { WorkforceService } from '../application/workforce.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import {
  CreateTransferDto,
  ApproveTransferDto,
  CreatePromotionDto,
  ApprovePromotionDto,
  CreateOffboardingDto,
  CompleteOffboardingDto,
  CreateOnboardingPlanDto,
} from '../application/dto/index.js';
import { TenantAccessDeniedError } from '../../../shared/errors/index.js';

export class WorkforceController {
  private static service = new WorkforceService();

  private static validateTenant(req: Request): string {
    const { organizationId } = req.tenantContext!;
    const pathOrgId = req.params.orgId || req.params.organizationId;
    if (pathOrgId && pathOrgId !== organizationId) {
      throw new TenantAccessDeniedError('URL organization does not match authorized tenant context');
    }
    return organizationId;
  }

  // --- TRANSFERS ---

  public static async createTransfer(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const dto: CreateTransferDto = {
        ...req.body,
        organizationId,
        initiatedBy: req.user?.id || 'system',
      };
      const result = await WorkforceController.service.transferEmployee(dto, req.user?.id, req.requestId);
      sendSuccess(res, result, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async approveTransfer(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const transferId = req.params.id as string;
      const dto: ApproveTransferDto = {
        organizationId,
        transferId,
        approvedBy: req.user?.id || 'system',
        status: req.body.status || 'approved',
        notes: req.body.notes,
      };
      const result = await WorkforceController.service.approveTransfer(dto, req.user?.id, req.requestId);
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getTransfer(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const result = await WorkforceController.service.getTransfer(organizationId, req.params.id as string);
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listTransfers(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const result = await WorkforceController.service.listTransfers(organizationId, {
        employmentId: req.query.employmentId as string | undefined,
        status: req.query.status as any,
      });
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- PROMOTIONS ---

  public static async createPromotion(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const dto: CreatePromotionDto = {
        ...req.body,
        organizationId,
        initiatedBy: req.user?.id || 'system',
      };
      const result = await WorkforceController.service.promoteEmployee(dto, req.user?.id, req.requestId);
      sendSuccess(res, result, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async approvePromotion(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const promotionId = req.params.id as string;
      const dto: ApprovePromotionDto = {
        organizationId,
        promotionId,
        approvedBy: req.user?.id || 'system',
        status: req.body.status || 'approved',
        notes: req.body.notes,
      };
      const result = await WorkforceController.service.approvePromotion(dto, req.user?.id, req.requestId);
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getPromotion(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const result = await WorkforceController.service.getPromotion(organizationId, req.params.id as string);
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listPromotions(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const result = await WorkforceController.service.listPromotions(organizationId, {
        employmentId: req.query.employmentId as string | undefined,
        status: req.query.status as any,
      });
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- OFFBOARDINGS ---

  public static async initiateOffboarding(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const dto: CreateOffboardingDto = {
        ...req.body,
        organizationId,
        initiatedBy: req.user?.id || 'system',
      };
      const result = await WorkforceController.service.initiateOffboarding(dto, req.user?.id, req.requestId);
      sendSuccess(res, result, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async completeOffboarding(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const offboardingId = req.params.id as string;
      const dto: CompleteOffboardingDto = {
        organizationId,
        offboardingId,
        completedBy: req.user?.id || 'system',
        notes: req.body.notes,
      };
      const result = await WorkforceController.service.completeOffboarding(dto, req.user?.id, req.requestId);
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getOffboarding(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const result = await WorkforceController.service.getOffboarding(organizationId, req.params.id as string);
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listOffboardings(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const result = await WorkforceController.service.listOffboardings(organizationId, {
        status: req.query.status as any,
      });
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // --- ONBOARDING PLANS ---

  public static async createOnboardingPlan(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const dto: CreateOnboardingPlanDto = {
        ...req.body,
        organizationId,
        initiatedBy: req.user?.id || 'system',
      };
      const result = await WorkforceController.service.createOnboardingPlan(dto, req.user?.id, req.requestId);
      sendSuccess(res, result, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getOnboardingPlan(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const result = await WorkforceController.service.getOnboardingPlan(organizationId, req.params.id as string);
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listOnboardingPlans(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = WorkforceController.validateTenant(req);
      const result = await WorkforceController.service.listOnboardingPlans(organizationId, {
        status: req.query.status as any,
        personId: req.query.personId as string | undefined,
      });
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
