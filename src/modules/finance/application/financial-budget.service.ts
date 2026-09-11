import { FinancialBudgetRepository } from '../infrastructure/financial-budget.repository.js';
import { FinancialBudget, CreateBudgetInput, UpdateBudgetInput } from '../domain/financial-budget.entity.js';
import { AuditService } from '../../../audit/audit.service.js';
import { eventBus } from '../../../events/event-bus.js';
import { ValidationError } from '../../../shared/errors/index.js';

export class FinancialBudgetService {
  private repository: FinancialBudgetRepository;

  constructor(repository?: FinancialBudgetRepository) {
    this.repository = repository || new FinancialBudgetRepository();
  }

  public async createBudget(organizationId: string, input: CreateBudgetInput, actorUserId?: string): Promise<FinancialBudget> {
    if (input.budgetAmount < 0) {
      throw new ValidationError('Budget amount cannot be negative');
    }

    const budget = await this.repository.createBudget(organizationId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCIAL_BUDGET_CREATED',
      entityType: 'financial_budget',
      entityId: budget.id,
      payload: { periodName: budget.periodName, budgetAmount: budget.budgetAmount },
    });

    eventBus.publish({
      eventName: 'budget.created',
      organizationId,
      actorId: actorUserId,
      entityType: 'financial_budget',
      entityId: budget.id,
      payload: {
        periodName: budget.periodName,
        budgetAmount: budget.budgetAmount,
      },
    });

    return budget;
  }

  public async getBudget(organizationId: string, budgetId: string): Promise<FinancialBudget> {
    return this.repository.getBudgetById(organizationId, budgetId);
  }

  public async listBudgets(
    organizationId: string,
    filters?: { businessUnitId?: string; projectId?: string; status?: string }
  ): Promise<FinancialBudget[]> {
    return this.repository.listBudgets(organizationId, filters);
  }

  public async updateBudget(
    organizationId: string,
    budgetId: string,
    input: UpdateBudgetInput,
    actorUserId?: string
  ): Promise<FinancialBudget> {
    const updated = await this.repository.updateBudget(organizationId, budgetId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCIAL_BUDGET_UPDATED',
      entityType: 'financial_budget',
      entityId: budgetId,
      payload: { budgetAmount: updated.budgetAmount, status: updated.status },
    });

    eventBus.publish({
      eventName: 'budget.updated',
      organizationId,
      actorId: actorUserId,
      entityType: 'financial_budget',
      entityId: budgetId,
      payload: {
        budgetAmount: updated.budgetAmount,
        status: updated.status,
      },
    });

    return updated;
  }
}
