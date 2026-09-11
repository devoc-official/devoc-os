import { FinancialObligationRepository } from '../infrastructure/financial-obligation.repository.js';
import {
  FinancialObligation,
  FinancialAdjustment,
  ObligationState,
  AdjustmentType,
  CreateObligationInput,
  validateObligationStateTransition,
} from '../domain/financial-obligation.entity.js';
import { AuditService } from '../../../audit/audit.service.js';
import { eventBus } from '../../../events/event-bus.js';
import { ValidationError } from '../../../shared/errors/index.js';

export class FinancialObligationService {
  private repository: FinancialObligationRepository;

  constructor(repository?: FinancialObligationRepository) {
    this.repository = repository || new FinancialObligationRepository();
  }

  public async createObligation(
    organizationId: string,
    input: CreateObligationInput,
    actorUserId?: string
  ): Promise<FinancialObligation> {
    const obligation = await this.repository.createObligation(organizationId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCIAL_OBLIGATION_CREATED',
      entityType: 'financial_obligation',
      entityId: obligation.id,
      payload: { title: obligation.title, direction: obligation.direction, netAmount: obligation.netAmount },
    });

    eventBus.publish({
      eventName: 'financial_obligation.created',
      organizationId,
      actorId: actorUserId,
      entityType: 'financial_obligation',
      entityId: obligation.id,
      payload: {
        partyId: obligation.partyId,
        title: obligation.title,
        netAmount: obligation.netAmount,
        state: obligation.state,
      },
    });

    return obligation;
  }

  public async getObligation(organizationId: string, obligationId: string): Promise<FinancialObligation> {
    return this.repository.getObligationById(organizationId, obligationId);
  }

  public async listObligations(
    organizationId: string,
    filters?: {
      partyId?: string;
      direction?: string;
      state?: ObligationState;
      projectId?: string;
      businessUnitId?: string;
    }
  ): Promise<FinancialObligation[]> {
    return this.repository.listObligations(organizationId, filters);
  }

  public async transitionState(
    organizationId: string,
    obligationId: string,
    targetState: ObligationState,
    actorUserId?: string
  ): Promise<FinancialObligation> {
    const existing = await this.repository.getObligationById(organizationId, obligationId);
    validateObligationStateTransition(existing.state, targetState);

    const updated = await this.repository.updateObligationState(organizationId, obligationId, targetState);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: `FINANCIAL_OBLIGATION_${targetState.toUpperCase()}`,
      entityType: 'financial_obligation',
      entityId: obligationId,
      payload: { previousState: existing.state, newState: targetState },
    });

    eventBus.publish({
      eventName: `financial_obligation.${targetState.toLowerCase()}`,
      organizationId,
      actorId: actorUserId,
      entityType: 'financial_obligation',
      entityId: obligationId,
      payload: {
        previousState: existing.state,
        newState: targetState,
      },
    });

    return updated;
  }

  public async addAdjustment(
    organizationId: string,
    obligationId: string,
    adjustmentType: AdjustmentType,
    amount: number,
    reason: string,
    actorUserId?: string
  ): Promise<FinancialAdjustment> {
    if (amount <= 0) {
      throw new ValidationError('Adjustment amount must be greater than zero');
    }

    const obligation = await this.repository.getObligationById(organizationId, obligationId);
    if (obligation.state === 'Paid' || obligation.state === 'Cancelled') {
      throw new ValidationError(`Cannot add adjustments to obligation in terminal state '${obligation.state}'`);
    }

    const adjustment = await this.repository.addAdjustment(
      organizationId,
      obligationId,
      adjustmentType,
      amount,
      reason,
      actorUserId
    );

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCIAL_ADJUSTMENT_CREATED',
      entityType: 'financial_obligation',
      entityId: obligationId,
      payload: { adjustmentType, amount, reason },
    });

    eventBus.publish({
      eventName: 'financial_adjustment.created',
      organizationId,
      actorId: actorUserId,
      entityType: 'financial_obligation',
      entityId: obligationId,
      payload: {
        adjustmentType,
        amount,
        reason,
      },
    });

    return adjustment;
  }
}
