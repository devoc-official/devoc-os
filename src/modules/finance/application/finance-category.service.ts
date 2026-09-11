import { FinanceCategoryRepository } from '../infrastructure/finance-category.repository.js';
import { FinanceCategory, CreateCategoryInput, UpdateCategoryInput } from '../domain/finance-category.entity.js';
import { AuditService } from '../../../audit/audit.service.js';

export class FinanceCategoryService {
  private repository: FinanceCategoryRepository;

  constructor(repository?: FinanceCategoryRepository) {
    this.repository = repository || new FinanceCategoryRepository();
  }

  public async createCategory(organizationId: string, input: CreateCategoryInput, actorUserId?: string): Promise<FinanceCategory> {
    const category = await this.repository.createCategory(organizationId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCE_CATEGORY_CREATED',
      entityType: 'finance_category',
      entityId: category.id,
      payload: { name: category.name, code: category.code, categoryType: category.categoryType },
    });

    return category;
  }

  public async getCategory(organizationId: string, categoryId: string): Promise<FinanceCategory> {
    return this.repository.getCategoryById(organizationId, categoryId);
  }

  public async listCategories(organizationId: string): Promise<FinanceCategory[]> {
    return this.repository.listCategories(organizationId);
  }

  public async updateCategory(
    organizationId: string,
    categoryId: string,
    input: UpdateCategoryInput,
    actorUserId?: string
  ): Promise<FinanceCategory> {
    const updated = await this.repository.updateCategory(organizationId, categoryId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCE_CATEGORY_UPDATED',
      entityType: 'finance_category',
      entityId: categoryId,
      payload: { name: updated.name, isActive: updated.isActive },
    });

    return updated;
  }
}
