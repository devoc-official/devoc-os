import { MetricDefinitionRepository, ListMetricFilters } from '../infrastructure/metric-definition.repository.js';
import {
  MetricDefinition,
  CreateMetricDefinitionInput,
  UpdateMetricDefinitionInput,
  validateMetricDefinitionInput,
} from '../domain/metric-definition.entity.js';
import { AuditService } from '../../../audit/audit.service.js';
import { eventBus } from '../../../events/event-bus.js';

export class MetricDefinitionService {
  private repository: MetricDefinitionRepository;

  constructor(repository?: MetricDefinitionRepository) {
    this.repository = repository || new MetricDefinitionRepository();
  }

  public async createMetricDefinition(
    organizationId: string,
    input: CreateMetricDefinitionInput,
    actorUserId?: string
  ): Promise<MetricDefinition> {
    // Declarative Safety validation against Analytics Source Registry
    validateMetricDefinitionInput(input);

    const metric = await this.repository.create(organizationId, input, actorUserId);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'ANALYTICS_METRIC_CREATED',
      entityType: 'analytics_metric_definition',
      entityId: metric.id,
      payload: {
        name: metric.name,
        code: metric.code,
        domainModule: metric.domainModule,
        metricType: metric.metricType,
      },
    });

    eventBus.publish({
      eventName: 'analytics.metric.created',
      organizationId,
      actorId: actorUserId,
      entityType: 'analytics_metric_definition',
      entityId: metric.id,
      payload: {
        name: metric.name,
        code: metric.code,
        domainModule: metric.domainModule,
        metricType: metric.metricType,
      },
    });

    return metric;
  }

  public async getMetricDefinition(
    organizationId: string,
    id: string
  ): Promise<MetricDefinition> {
    return this.repository.getById(organizationId, id);
  }

  public async getMetricDefinitionByCode(
    organizationId: string,
    code: string
  ): Promise<MetricDefinition | null> {
    return this.repository.getByCode(organizationId, code);
  }

  public async listMetricDefinitions(
    organizationId: string,
    filters: ListMetricFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: MetricDefinition[]; total: number }> {
    return this.repository.list(organizationId, filters, limit, offset);
  }

  public async updateMetricDefinition(
    organizationId: string,
    id: string,
    input: UpdateMetricDefinitionInput,
    actorUserId?: string
  ): Promise<MetricDefinition> {
    // Validate calculationSpec if updated
    if (input.calculationSpec) {
      validateMetricDefinitionInput({
        name: input.name || 'temp',
        code: 'temp',
        domainModule: input.domainModule || 'learning',
        metricType: input.metricType || 'COUNT',
        calculationSpec: input.calculationSpec,
        supportedDimensions: input.supportedDimensions,
      });
    }

    const updated = await this.repository.update(organizationId, id, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'ANALYTICS_METRIC_UPDATED',
      entityType: 'analytics_metric_definition',
      entityId: updated.id,
      payload: {
        name: updated.name,
        code: updated.code,
        isActive: updated.isActive,
      },
    });

    eventBus.publish({
      eventName: 'analytics.metric.updated',
      organizationId,
      actorId: actorUserId,
      entityType: 'analytics_metric_definition',
      entityId: updated.id,
      payload: {
        name: updated.name,
        code: updated.code,
        isActive: updated.isActive,
      },
    });

    return updated;
  }
}
