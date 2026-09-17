import { WorkCategoryRepository } from '../infrastructure/work-category.repository.js';
import { WorkCategory } from '../domain/work.entity.js';
import { ValidationError, NotFoundError } from '../../../shared/errors/index.js';
import { eventBus } from '../../../events/event-bus.js';

export interface CreateWorkCategoryDTO {
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  active?: boolean;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
}

export interface UpdateWorkCategoryDTO {
  name?: string;
  description?: string | null;
  active?: boolean;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
}

export const INITIAL_WORK_CATEGORIES = [
  { name: 'Engineering', code: 'engineering', description: 'Software engineering, development, and infrastructure' },
  { name: 'Product', code: 'product', description: 'Product management, UI/UX, design, and product strategy' },
  { name: 'Management', code: 'management', description: 'Executive, organizational, and team management' },
  { name: 'Business Development', code: 'business_development', description: 'Partnerships, alliances, and growth initiatives' },
  { name: 'Sales', code: 'sales', description: 'Client acquisition, sales pipeline, and revenue generation' },
  { name: 'Marketing', code: 'marketing', description: 'Branding, content, community, and marketing campaigns' },
  { name: 'Strategy', code: 'strategy', description: 'Corporate strategy, product vision, and strategic planning' },
  { name: 'Operations', code: 'operations', description: 'General operations, HR, admin, and legal' },
  { name: 'Academy', code: 'academy', description: 'Teaching, mentoring, student reviews, and learning content' },
  { name: 'Research', code: 'research', description: 'R&D, technical investigations, and market research' },
  { name: 'Support', code: 'support', description: 'Customer support, client servicing, and technical help' },
  { name: 'Other', code: 'other', description: 'Miscellaneous contribution' },
];

export class WorkCategoryService {
  public static async seedDefaultCategories(organizationId: string): Promise<WorkCategory[]> {
    const categories: WorkCategory[] = [];
    for (const cat of INITIAL_WORK_CATEGORIES) {
      const existing = await WorkCategoryRepository.findCategoryByCode(organizationId, cat.code);
      if (!existing) {
        const created = await WorkCategoryRepository.createCategory({
          organizationId,
          name: cat.name,
          code: cat.code,
          description: cat.description,
          active: true,
        });
        categories.push(created);
      } else {
        categories.push(existing);
      }
    }
    return categories;
  }

  public static async createCategory(dto: CreateWorkCategoryDTO): Promise<WorkCategory> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Category name is required');
    }
    if (!dto.code || dto.code.trim().length === 0) {
      throw new ValidationError('Category code is required');
    }

    const existingCode = await WorkCategoryRepository.findCategoryByCode(dto.organizationId, dto.code);
    if (existingCode) {
      throw new ValidationError(`Category with code '${dto.code.trim().toLowerCase()}' already exists in organization`);
    }

    const category = await WorkCategoryRepository.createCategory({
      organizationId: dto.organizationId,
      name: dto.name,
      code: dto.code,
      description: dto.description,
      active: dto.active,
      metadata: dto.metadata,
    });

    eventBus.publish({
      eventName: 'work_category.created',
      organizationId: dto.organizationId,
      actorId: dto.actorUserId,
      entityType: 'work_category',
      entityId: category.id,
      payload: { name: category.name, code: category.code },
    });

    return category;
  }

  public static async getCategoryById(organizationId: string, categoryId: string): Promise<WorkCategory> {
    const category = await WorkCategoryRepository.findCategoryById(organizationId, categoryId);
    if (!category) {
      throw new NotFoundError(`Work category '${categoryId}' not found in organization`);
    }
    return category;
  }

  public static async listCategories(
    organizationId: string,
    activeOnly: boolean = false
  ): Promise<WorkCategory[]> {
    return WorkCategoryRepository.findAllCategories(organizationId, activeOnly);
  }

  public static async updateCategory(
    organizationId: string,
    categoryId: string,
    dto: UpdateWorkCategoryDTO
  ): Promise<WorkCategory> {
    const category = await WorkCategoryRepository.findCategoryById(organizationId, categoryId);
    if (!category) {
      throw new NotFoundError(`Work category '${categoryId}' not found in organization`);
    }

    const updated = await WorkCategoryRepository.updateCategory(organizationId, categoryId, dto);
    if (!updated) {
      throw new NotFoundError(`Work category '${categoryId}' not found in organization`);
    }

    eventBus.publish({
      eventName: 'work_category.updated',
      organizationId,
      actorId: dto.actorUserId,
      entityType: 'work_category',
      entityId: categoryId,
      payload: { updates: dto },
    });

    return updated;
  }
}
