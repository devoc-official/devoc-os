import { withTransaction, DbClient, getDbClient } from '../../../database/index.js';
import { WorkforceRepository } from '../infrastructure/workforce.repository.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { EmploymentRepository } from '../../people/infrastructure/employment.repository.js';
import { PeopleRepository } from '../../people/infrastructure/people.repository.js';
import { FinancialObligationRepository } from '../../finance/infrastructure/financial-obligation.repository.js';
import {
  CreateOnboardingPlanDto,
  UpdateOnboardingPlanDto,
  CreateTransferDto,
  ApproveTransferDto,
  CreatePromotionDto,
  ApprovePromotionDto,
  CreateOffboardingDto,
  CompleteOffboardingDto,
} from './dto/index.js';
import {
  OnboardingPlan,
  WorkforceTransfer,
  WorkforcePromotion,
  WorkforceOffboarding,
  OnboardingPlanStatus,
  MovementStatus,
  OffboardingStatus,
  ExitReason,
} from '../domain/workforce.types.js';
import { NotFoundError, InvalidStateTransitionError } from '../../../shared/errors/index.js';

export class WorkforceService {
  constructor(
    private readonly workforceRepo: WorkforceRepository = new WorkforceRepository(),
    private readonly financeObligationRepo: FinancialObligationRepository = new FinancialObligationRepository()
  ) {}

  private isUuid(id?: string | null): boolean {
    return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  }

  private async resolveActor(
    organizationId: string,
    actor?: string | null,
    tx?: DbClient
  ): Promise<{ userId?: string; personId?: string }> {
    if (!actor || !this.isUuid(actor)) {
      return {};
    }
    const db = tx || getDbClient();
    try {
      const userRes = await db.query('SELECT id FROM users WHERE id = $1', [actor]);
      if (userRes.rows.length > 0) {
        const person = await PeopleRepository.findPersonByUserId(organizationId, actor);
        return { userId: actor, personId: person?.id };
      }
      const person = await PeopleRepository.findPersonById(organizationId, actor);
      if (person) {
        return { personId: person.id, userId: person.userId || undefined };
      }
    } catch {
      // Ignore resolution errors
    }
    return {};
  }

  // ==================== ONBOARDING PLANS ====================

  public async createOnboardingPlan(
    dto: CreateOnboardingPlanDto,
    actorId?: string,
    requestId?: string
  ): Promise<OnboardingPlan> {
    // 1. Cross-domain Tenant Isolation Validation: Person & Employment must exist in organization
    const person = await PeopleRepository.findPersonById(dto.organizationId, dto.personId);
    if (!person) {
      throw new NotFoundError(`Person '${dto.personId}' not found in organization`);
    }

    const employment = await EmploymentRepository.findEmploymentById(dto.organizationId, dto.employmentId);
    if (!employment) {
      throw new NotFoundError(`Employment '${dto.employmentId}' not found in organization`);
    }

    if (employment.personId !== dto.personId) {
      throw new NotFoundError(`Employment '${dto.employmentId}' does not belong to person '${dto.personId}'`);
    }

    // 2. Idempotency check: return existing plan if already created
    const existing = await this.workforceRepo.findPlanByEmployment(dto.organizationId, dto.employmentId);
    if (existing) {
      return existing;
    }

    // 3. Transactional Outbox Pattern
    const txResult = await withTransaction(async (tx: DbClient) => {
      let createdPlan: OnboardingPlan;
      try {
        createdPlan = await this.workforceRepo.createPlan(
          {
            organizationId: dto.organizationId,
            employmentId: dto.employmentId,
            personId: dto.personId,
            templateId: dto.templateId,
            status: (dto.status as OnboardingPlanStatus) || 'initiated',
            targetCompletionDate: dto.targetCompletionDate ? new Date(dto.targetCompletionDate) : undefined,
            notes: dto.notes,
          },
          tx
        );
      } catch (err: any) {
        // Handle concurrent duplicate insertion gracefully (Postgres unique constraint 23505)
        if (err?.code === '23505' || err?.message?.includes('uq_workforce_onboarding_plans_employment')) {
          const plan = await this.workforceRepo.findPlanByEmployment(dto.organizationId, dto.employmentId, tx);
          if (plan) return { plan, outbox: null };
        }
        throw err;
      }

      const actor = await this.resolveActor(dto.organizationId, actorId || dto.initiatedBy, tx);
      await AuditService.recordLog({
        organizationId: dto.organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'workforce.onboarding_plan.created',
        entityType: 'OnboardingPlan',
        entityId: createdPlan.id,
        afterState: createdPlan as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: dto.organizationId,
        eventName: 'workforce.onboarding_plan.created',
        entityType: 'OnboardingPlan',
        entityId: createdPlan.id,
        payload: {
          planId: createdPlan.id,
          employmentId: createdPlan.employmentId,
          personId: createdPlan.personId,
          status: createdPlan.status,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { plan: createdPlan, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.plan;
  }

  public async updateOnboardingPlan(
    dto: UpdateOnboardingPlanDto,
    actorId?: string,
    requestId?: string
  ): Promise<OnboardingPlan> {
    const existing = await this.workforceRepo.findPlanById(dto.organizationId, dto.planId);
    if (!existing) {
      throw new NotFoundError(`Onboarding plan '${dto.planId}' not found in organization`);
    }

    const txResult = await withTransaction(async (tx: DbClient) => {
      const updated = await this.workforceRepo.updatePlanStatus(
        dto.organizationId,
        dto.planId,
        dto.status as OnboardingPlanStatus,
        dto.status === 'completed' ? new Date() : undefined,
        tx
      );

      if (!updated) {
        throw new NotFoundError(`Onboarding plan '${dto.planId}' not found`);
      }

      const actor = await this.resolveActor(dto.organizationId, actorId || dto.updatedBy, tx);
      await AuditService.recordLog({
        organizationId: dto.organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: `workforce.onboarding_plan.${dto.status}`,
        entityType: 'OnboardingPlan',
        entityId: updated.id,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce',
        dbClient: tx,
      });

      const eventName = dto.status === 'completed'
        ? 'workforce.onboarding_plan.completed'
        : dto.status === 'cancelled'
        ? 'workforce.onboarding_plan.cancelled'
        : 'workforce.onboarding_plan.initiated';

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: dto.organizationId,
        eventName,
        entityType: 'OnboardingPlan',
        entityId: updated.id,
        payload: { planId: updated.id, status: updated.status },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { plan: updated, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.plan;
  }

  public async getOnboardingPlan(organizationId: string, id: string): Promise<OnboardingPlan> {
    const plan = await this.workforceRepo.findPlanById(organizationId, id);
    if (!plan) {
      throw new NotFoundError(`Onboarding plan '${id}' not found in organization`);
    }
    return plan;
  }

  public async listOnboardingPlans(
    organizationId: string,
    filters?: { status?: OnboardingPlanStatus; personId?: string }
  ): Promise<OnboardingPlan[]> {
    return this.workforceRepo.listPlans(organizationId, filters);
  }

  // ==================== TRANSFERS ====================

  public async transferEmployee(
    dto: CreateTransferDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceTransfer> {
    // 1. Cross-domain Tenant Validation
    const person = await PeopleRepository.findPersonById(dto.organizationId, dto.personId);
    if (!person) {
      throw new NotFoundError(`Person '${dto.personId}' not found in organization`);
    }

    const employment = await EmploymentRepository.findEmploymentById(dto.organizationId, dto.employmentId);
    if (!employment) {
      throw new NotFoundError(`Employment '${dto.employmentId}' not found in organization`);
    }

    if (employment.personId !== dto.personId) {
      throw new NotFoundError(`Employment '${dto.employmentId}' does not belong to person '${dto.personId}'`);
    }

    if (dto.targetManagerId) {
      const targetManager = await PeopleRepository.findPersonById(dto.organizationId, dto.targetManagerId);
      if (!targetManager) {
        throw new NotFoundError(`Target manager '${dto.targetManagerId}' not found in organization`);
      }
    }

    // 2. Transactional Outbox
    const txResult = await withTransaction(async (tx: DbClient) => {
      const transfer = await this.workforceRepo.createTransfer(
        {
          organizationId: dto.organizationId,
          employmentId: dto.employmentId,
          personId: dto.personId,
          sourceBusinessUnitId: dto.sourceBusinessUnitId,
          targetBusinessUnitId: dto.targetBusinessUnitId,
          sourceDepartmentId: dto.sourceDepartmentId,
          targetDepartmentId: dto.targetDepartmentId,
          sourceTeamId: dto.sourceTeamId,
          targetTeamId: dto.targetTeamId,
          sourceManagerId: dto.sourceManagerId,
          targetManagerId: dto.targetManagerId,
          reason: dto.reason,
          effectiveDate: new Date(dto.effectiveDate),
          status: 'draft',
        },
        tx
      );

      const actor = await this.resolveActor(dto.organizationId, actorId || dto.initiatedBy, tx);
      await AuditService.recordLog({
        organizationId: dto.organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'workforce.transfer.requested',
        entityType: 'WorkforceTransfer',
        entityId: transfer.id,
        afterState: transfer as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: dto.organizationId,
        eventName: 'workforce.transfer.requested',
        entityType: 'WorkforceTransfer',
        entityId: transfer.id,
        payload: {
          transferId: transfer.id,
          employmentId: transfer.employmentId,
          personId: transfer.personId,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { transfer, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.transfer;
  }

  public async approveTransfer(
    dto: ApproveTransferDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceTransfer> {
    const existing = await this.workforceRepo.findTransferById(dto.organizationId, dto.transferId);
    if (!existing) {
      throw new NotFoundError(`Transfer '${dto.transferId}' not found in organization`);
    }

    if (['approved', 'executed', 'rejected', 'cancelled'].includes(existing.status)) {
      throw new InvalidStateTransitionError(`Cannot transition transfer from terminal state '${existing.status}'`);
    }

    const nextStatus: MovementStatus = dto.status === 'approved' ? 'approved' : 'rejected';

    let approverPersonId: string | null = null;
    if (dto.approvedBy) {
      const byPerson = await PeopleRepository.findPersonById(dto.organizationId, dto.approvedBy);
      if (byPerson) {
        approverPersonId = byPerson.id;
      } else {
        const userPerson = await PeopleRepository.findPersonByUserId(dto.organizationId, dto.approvedBy);
        if (userPerson) {
          approverPersonId = userPerson.id;
        }
      }
    }

    const txResult = await withTransaction(async (tx: DbClient) => {
      const updated = await this.workforceRepo.updateTransferStatus(
        dto.organizationId,
        dto.transferId,
        nextStatus,
        {
          approvedAt: new Date(),
          approvedByPersonId: approverPersonId,
        },
        tx
      );

      if (!updated) {
        throw new NotFoundError(`Transfer '${dto.transferId}' not found`);
      }

      const actor = await this.resolveActor(dto.organizationId, actorId || dto.approvedBy, tx);
      await AuditService.recordLog({
        organizationId: dto.organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: `workforce.transfer.${nextStatus}`,
        entityType: 'WorkforceTransfer',
        entityId: updated.id,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce',
        dbClient: tx,
      });

      const eventName = nextStatus === 'approved' ? 'workforce.transfer.approved' : 'workforce.transfer.cancelled';
      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: dto.organizationId,
        eventName,
        entityType: 'WorkforceTransfer',
        entityId: updated.id,
        payload: { transferId: updated.id, status: updated.status },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { transfer: updated, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.transfer;
  }

  public async getTransfer(organizationId: string, id: string): Promise<WorkforceTransfer> {
    const transfer = await this.workforceRepo.findTransferById(organizationId, id);
    if (!transfer) {
      throw new NotFoundError(`Transfer '${id}' not found in organization`);
    }
    return transfer;
  }

  public async listTransfers(
    organizationId: string,
    filters?: { employmentId?: string; status?: MovementStatus }
  ): Promise<WorkforceTransfer[]> {
    return this.workforceRepo.listTransfers(organizationId, filters);
  }

  // ==================== PROMOTIONS ====================

  public async promoteEmployee(
    dto: CreatePromotionDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforcePromotion> {
    const person = await PeopleRepository.findPersonById(dto.organizationId, dto.personId);
    if (!person) {
      throw new NotFoundError(`Person '${dto.personId}' not found in organization`);
    }

    const employment = await EmploymentRepository.findEmploymentById(dto.organizationId, dto.employmentId);
    if (!employment) {
      throw new NotFoundError(`Employment '${dto.employmentId}' not found in organization`);
    }

    if (employment.personId !== dto.personId) {
      throw new NotFoundError(`Employment '${dto.employmentId}' does not belong to person '${dto.personId}'`);
    }

    const txResult = await withTransaction(async (tx: DbClient) => {
      const promotion = await this.workforceRepo.createPromotion(
        {
          organizationId: dto.organizationId,
          employmentId: dto.employmentId,
          personId: dto.personId,
          sourceJobTitle: dto.sourceJobTitle,
          targetJobTitle: dto.targetJobTitle,
          sourcePersonRoleId: dto.sourcePersonRoleId,
          targetPersonRoleId: dto.targetPersonRoleId,
          reason: dto.reason,
          effectiveDate: new Date(dto.effectiveDate),
          status: 'draft',
        },
        tx
      );

      const actor = await this.resolveActor(dto.organizationId, actorId || dto.initiatedBy, tx);
      await AuditService.recordLog({
        organizationId: dto.organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'workforce.promotion.requested',
        entityType: 'WorkforcePromotion',
        entityId: promotion.id,
        afterState: promotion as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: dto.organizationId,
        eventName: 'workforce.promotion.requested',
        entityType: 'WorkforcePromotion',
        entityId: promotion.id,
        payload: {
          promotionId: promotion.id,
          employmentId: promotion.employmentId,
          personId: promotion.personId,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { promotion, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.promotion;
  }

  public async approvePromotion(
    dto: ApprovePromotionDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforcePromotion> {
    const existing = await this.workforceRepo.findPromotionById(dto.organizationId, dto.promotionId);
    if (!existing) {
      throw new NotFoundError(`Promotion '${dto.promotionId}' not found in organization`);
    }

    if (['approved', 'executed', 'rejected', 'cancelled'].includes(existing.status)) {
      throw new InvalidStateTransitionError(`Cannot transition promotion from terminal state '${existing.status}'`);
    }

    const nextStatus: MovementStatus = dto.status === 'approved' ? 'approved' : 'rejected';

    let approverPersonId: string | null = null;
    if (dto.approvedBy) {
      const byPerson = await PeopleRepository.findPersonById(dto.organizationId, dto.approvedBy);
      if (byPerson) {
        approverPersonId = byPerson.id;
      } else {
        const userPerson = await PeopleRepository.findPersonByUserId(dto.organizationId, dto.approvedBy);
        if (userPerson) {
          approverPersonId = userPerson.id;
        }
      }
    }

    const txResult = await withTransaction(async (tx: DbClient) => {
      const updated = await this.workforceRepo.updatePromotionStatus(
        dto.organizationId,
        dto.promotionId,
        nextStatus,
        {
          approvedAt: new Date(),
          approvedByPersonId: approverPersonId,
        },
        tx
      );

      if (!updated) {
        throw new NotFoundError(`Promotion '${dto.promotionId}' not found`);
      }

      // M2 Integration: If approved, update target job title on employment
      if (nextStatus === 'approved') {
        await EmploymentRepository.updateEmployment(
          dto.organizationId,
          existing.employmentId,
          {
            jobTitle: existing.targetJobTitle,
          },
          tx
        );
      }

      const actor = await this.resolveActor(dto.organizationId, actorId || dto.approvedBy, tx);
      await AuditService.recordLog({
        organizationId: dto.organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: `workforce.promotion.${nextStatus}`,
        entityType: 'WorkforcePromotion',
        entityId: updated.id,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce',
        dbClient: tx,
      });

      const eventName = nextStatus === 'approved' ? 'workforce.promotion.approved' : 'workforce.promotion.cancelled';
      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: dto.organizationId,
        eventName,
        entityType: 'WorkforcePromotion',
        entityId: updated.id,
        payload: { promotionId: updated.id, status: updated.status },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { promotion: updated, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.promotion;
  }

  public async getPromotion(organizationId: string, id: string): Promise<WorkforcePromotion> {
    const promotion = await this.workforceRepo.findPromotionById(organizationId, id);
    if (!promotion) {
      throw new NotFoundError(`Promotion '${id}' not found in organization`);
    }
    return promotion;
  }

  public async listPromotions(
    organizationId: string,
    filters?: { employmentId?: string; status?: MovementStatus }
  ): Promise<WorkforcePromotion[]> {
    return this.workforceRepo.listPromotions(organizationId, filters);
  }

  // ==================== OFFBOARDING ====================

  public async initiateOffboarding(
    dto: CreateOffboardingDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceOffboarding> {
    const person = await PeopleRepository.findPersonById(dto.organizationId, dto.personId);
    if (!person) {
      throw new NotFoundError(`Person '${dto.personId}' not found in organization`);
    }

    const employment = await EmploymentRepository.findEmploymentById(dto.organizationId, dto.employmentId);
    if (!employment) {
      throw new NotFoundError(`Employment '${dto.employmentId}' not found in organization`);
    }

    if (employment.personId !== dto.personId) {
      throw new NotFoundError(`Employment '${dto.employmentId}' does not belong to person '${dto.personId}'`);
    }

    const txResult = await withTransaction(async (tx: DbClient) => {
      const offboarding = await this.workforceRepo.createOffboarding(
        {
          organizationId: dto.organizationId,
          employmentId: dto.employmentId,
          personId: dto.personId,
          exitReason: dto.exitReason as ExitReason,
          exitDate: new Date(dto.exitDate),
          status: (dto.status as OffboardingStatus) || 'initiated',
          notes: dto.notes,
        },
        tx
      );

      // Create default clearances
      await this.workforceRepo.createClearance(
        {
          organizationId: dto.organizationId,
          offboardingId: offboarding.id,
          clearanceType: 'it_access',
          notes: 'Standard IT access revocation',
        },
        tx
      );

      await this.workforceRepo.createClearance(
        {
          organizationId: dto.organizationId,
          offboardingId: offboarding.id,
          clearanceType: 'equipment_return',
          notes: 'Company asset and hardware return',
        },
        tx
      );

      await this.workforceRepo.createClearance(
        {
          organizationId: dto.organizationId,
          offboardingId: offboarding.id,
          clearanceType: 'financial_settlement',
          notes: 'Final settlement and accounts clearance',
        },
        tx
      );

      const actor = await this.resolveActor(dto.organizationId, actorId || dto.initiatedBy, tx);
      await AuditService.recordLog({
        organizationId: dto.organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'workforce.offboarding.initiated',
        entityType: 'WorkforceOffboarding',
        entityId: offboarding.id,
        afterState: offboarding as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: dto.organizationId,
        eventName: 'workforce.offboarding.initiated',
        entityType: 'WorkforceOffboarding',
        entityId: offboarding.id,
        payload: {
          offboardingId: offboarding.id,
          employmentId: offboarding.employmentId,
          personId: offboarding.personId,
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { offboarding, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.offboarding;
  }

  public async completeOffboarding(
    dto: CompleteOffboardingDto,
    actorId?: string,
    requestId?: string
  ): Promise<WorkforceOffboarding> {
    const existing = await this.workforceRepo.findOffboardingById(dto.organizationId, dto.offboardingId);
    if (!existing) {
      throw new NotFoundError(`Offboarding '${dto.offboardingId}' not found in organization`);
    }

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new InvalidStateTransitionError(`Cannot complete offboarding from terminal status '${existing.status}'`);
    }

    const txResult = await withTransaction(async (tx: DbClient) => {
      // 1. Complete offboarding record
      const updated = await this.workforceRepo.updateOffboardingStatus(
        dto.organizationId,
        dto.offboardingId,
        'completed',
        new Date(),
        dto.notes,
        tx
      );

      if (!updated) {
        throw new NotFoundError(`Offboarding '${dto.offboardingId}' not found`);
      }

      // 2. M2 Integration: Authoritatively transition M2 Employment to resigned/terminated
      const nextEmploymentStatus = existing.exitReason === 'resignation' ? 'resigned' : 'terminated';
      await EmploymentRepository.updateEmployment(
        dto.organizationId,
        existing.employmentId,
        {
          status: nextEmploymentStatus,
          endDate: new Date(),
        },
        tx
      );

      await EmploymentRepository.recordHistory(
        {
          organizationId: dto.organizationId,
          employmentId: existing.employmentId,
          personId: existing.personId,
          previousStatus: 'active',
          newStatus: nextEmploymentStatus,
          changeReason: dto.notes || `Offboarding completed (${existing.exitReason})`,
          effectiveDate: new Date(),
        },
        tx
      );

      // 3. M10 Audit & Outbox
      const actor = await this.resolveActor(dto.organizationId, actorId || dto.completedBy, tx);
      await AuditService.recordLog({
        organizationId: dto.organizationId,
        actorId: actor.userId,
        actorPersonId: actor.personId,
        action: 'workforce.offboarding.completed',
        entityType: 'WorkforceOffboarding',
        entityId: updated.id,
        afterState: updated as unknown as Record<string, unknown>,
        requestId,
        sourceModule: 'workforce',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: dto.organizationId,
        eventName: 'workforce.offboarding.completed',
        entityType: 'WorkforceOffboarding',
        entityId: updated.id,
        payload: {
          offboardingId: updated.id,
          employmentId: updated.employmentId,
          personId: updated.personId,
          status: 'completed',
        },
        actorId: actor.userId,
        actorPersonId: actor.personId,
        requestId,
        dbClient: tx,
      });

      return { offboarding: updated, outbox };
    });

    if (txResult.outbox) {
      await OutboxService.dispatchImmediate(txResult.outbox);
    }
    return txResult.offboarding;
  }

  public async getOffboarding(organizationId: string, id: string): Promise<WorkforceOffboarding> {
    const offboarding = await this.workforceRepo.findOffboardingById(organizationId, id);
    if (!offboarding) {
      throw new NotFoundError(`Offboarding '${id}' not found in organization`);
    }
    return offboarding;
  }

  public async listOffboardings(
    organizationId: string,
    filters?: { status?: OffboardingStatus }
  ): Promise<WorkforceOffboarding[]> {
    return this.workforceRepo.listOffboardings(organizationId, filters);
  }

  // ==================== M9 FINANCIAL CLEARANCE VALIDATION ====================

  public async verifyFinancialClearance(
    organizationId: string,
    clearanceId: string,
    financialObligationId: string,
    verifierPersonId: string,
    notes?: string
  ) {
    // 1. M9 Finance Integration: Verify financial obligation exists in SAME tenant
    await this.financeObligationRepo.getObligationById(organizationId, financialObligationId);

    // 2. Verify clearance belongs to org
    const clearance = await this.workforceRepo.findClearanceById(organizationId, clearanceId);
    if (!clearance) {
      throw new NotFoundError(`Clearance '${clearanceId}' not found in organization`);
    }

    return await this.workforceRepo.updateClearanceStatus(
      organizationId,
      clearanceId,
      'cleared',
      verifierPersonId,
      notes
    );
  }
}
