import { EvaluationTemplateRepository } from '../infrastructure/evaluation-template.repository.js';
import { EvaluationTemplate, CreateTemplateInput, UpdateTemplateInput } from '../domain/evaluation-template.entity.js';
import { AuditService } from '../../../audit/audit.service.js';

export class EvaluationTemplateService {
  private repository: EvaluationTemplateRepository;

  constructor(repository?: EvaluationTemplateRepository) {
    this.repository = repository || new EvaluationTemplateRepository();
  }

  public async createTemplate(
    organizationId: string,
    input: CreateTemplateInput,
    actorUserId?: string
  ): Promise<EvaluationTemplate> {
    const template = await this.repository.createTemplate(organizationId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'EVALUATION_TEMPLATE_CREATED',
      entityType: 'evaluation_template',
      entityId: template.id,
      payload: { name: template.name, version: template.version },
    });

    return template;
  }

  public async getTemplate(organizationId: string, templateId: string): Promise<EvaluationTemplate> {
    return this.repository.getTemplateById(organizationId, templateId);
  }

  public async listTemplates(organizationId: string): Promise<EvaluationTemplate[]> {
    return this.repository.listTemplates(organizationId);
  }

  public async updateTemplate(
    organizationId: string,
    templateId: string,
    input: UpdateTemplateInput,
    actorUserId?: string
  ): Promise<EvaluationTemplate> {
    const updated = await this.repository.updateTemplate(organizationId, templateId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'EVALUATION_TEMPLATE_UPDATED',
      entityType: 'evaluation_template',
      entityId: templateId,
      payload: { name: updated.name, version: updated.version },
    });

    return updated;
  }

  public async deactivateTemplate(organizationId: string, templateId: string, actorUserId?: string): Promise<void> {
    await this.repository.softDeleteTemplate(organizationId, templateId);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'EVALUATION_TEMPLATE_DEACTIVATED',
      entityType: 'evaluation_template',
      entityId: templateId,
      payload: {},
    });
  }
}
