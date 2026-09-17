import { describe, it, expect } from 'vitest';
import {
  ANALYTICS_SOURCE_REGISTRY,
  AnalyticsSourceRegistryService,
  ALLOWED_OPERATORS,
  ALLOWED_AGGREGATIONS,
  ALLOWED_DIMENSIONS,
} from '../../src/modules/analytics/domain/source-registry.js';
import { validateMetricDefinitionInput } from '../../src/modules/analytics/domain/metric-definition.entity.js';

describe('Milestone 11 — Analytics Source Registry & Declarative Safety Unit Tests', () => {
  it('1. Registry contains all 65 logical sources with exact physical tables', () => {
    const sources = AnalyticsSourceRegistryService.listRegisteredSources();
    expect(sources.length).toBe(65);

    // Verify key mappings
    expect(ANALYTICS_SOURCE_REGISTRY.WORK_RECORD.physicalTable).toBe('work_records');
    expect(ANALYTICS_SOURCE_REGISTRY.PROJECT.physicalTable).toBe('projects');
    expect(ANALYTICS_SOURCE_REGISTRY.TASK.physicalTable).toBe('tasks');
    expect(ANALYTICS_SOURCE_REGISTRY.EVALUATION.physicalTable).toBe('evaluations');
    expect(ANALYTICS_SOURCE_REGISTRY.CRITERION_RESULT.physicalTable).toBe('criterion_results');
    expect(ANALYTICS_SOURCE_REGISTRY.LEARNING_ENROLLMENT.physicalTable).toBe('learning_enrollments');
    expect(ANALYTICS_SOURCE_REGISTRY.FINANCIAL_TRANSACTION.physicalTable).toBe('financial_transactions');
    expect(ANALYTICS_SOURCE_REGISTRY.MEETING.physicalTable).toBe('meetings');
    expect(ANALYTICS_SOURCE_REGISTRY.MEETING_TARGET.physicalTable).toBe('meeting_targets');
    expect(ANALYTICS_SOURCE_REGISTRY.AUDIT_LOG.physicalTable).toBe('audit_logs');
    expect(ANALYTICS_SOURCE_REGISTRY.EVENT_OUTBOX.physicalTable).toBe('event_outbox');
  });

  it('2. Exact physical columns are present in allowedDimensions without obsolete columns', () => {
    // TASK must have task_key, task_type, but NOT assignee_id
    const taskSource = ANALYTICS_SOURCE_REGISTRY.TASK;
    expect(taskSource.allowedDimensions).toContain('task_key');
    expect(taskSource.allowedDimensions).toContain('status');
    expect(taskSource.allowedDimensions).not.toContain('assignee_id');

    // PROJECT must have key, not code
    const projectSource = ANALYTICS_SOURCE_REGISTRY.PROJECT;
    expect(projectSource.allowedDimensions).toContain('key');
    expect(projectSource.allowedDimensions).not.toContain('code');

    // USER must have is_active, not status
    const userSource = ANALYTICS_SOURCE_REGISTRY.USER;
    expect(userSource.allowedDimensions).toContain('is_active');
    expect(userSource.allowedDimensions).not.toContain('status');

    // FINANCE_CATEGORY must have category_type, not type
    const finCatSource = ANALYTICS_SOURCE_REGISTRY.FINANCE_CATEGORY;
    expect(finCatSource.allowedDimensions).toContain('category_type');
    expect(finCatSource.allowedDimensions).not.toContain('type');

    // FINANCIAL_OBLIGATION must have state, balance_amount, due_at
    const finObliSource = ANALYTICS_SOURCE_REGISTRY.FINANCIAL_OBLIGATION;
    expect(finObliSource.allowedDimensions).toContain('state');
    expect(finObliSource.allowedDimensions).toContain('balance_amount');
    expect(finObliSource.allowedDimensions).toContain('due_at');

    // FINANCIAL_TRANSACTION must have payment_mode, state, posted_at (not payment_method, status)
    const finTxSource = ANALYTICS_SOURCE_REGISTRY.FINANCIAL_TRANSACTION;
    expect(finTxSource.allowedDimensions).toContain('payment_mode');
    expect(finTxSource.allowedDimensions).toContain('state');
    expect(finTxSource.allowedDimensions).toContain('posted_at');
    expect(finTxSource.allowedDimensions).not.toContain('payment_method');
    expect(finTxSource.allowedDimensions).not.toContain('status');

    // FINANCIAL_BUDGET must not have fiscal_year
    const finBudgetSource = ANALYTICS_SOURCE_REGISTRY.FINANCIAL_BUDGET;
    expect(finBudgetSource.allowedDimensions).toContain('period_name');
    expect(finBudgetSource.allowedDimensions).toContain('period_start');
    expect(finBudgetSource.allowedDimensions).not.toContain('fiscal_year');

    // MEETING must not have project_id / business_unit_id
    const meetingSource = ANALYTICS_SOURCE_REGISTRY.MEETING;
    expect(meetingSource.allowedDimensions).toContain('meeting_type_id');
    expect(meetingSource.allowedDimensions).not.toContain('project_id');
    expect(meetingSource.allowedDimensions).not.toContain('business_unit_id');
  });

  it('3. Source resolution — valid and invalid sources', () => {
    expect(AnalyticsSourceRegistryService.hasLogicalSource('WORK_RECORD')).toBe(true);
    expect(AnalyticsSourceRegistryService.getLogicalSource('WORK_RECORD')).toBeDefined();

    expect(AnalyticsSourceRegistryService.hasLogicalSource('NON_EXISTENT_SOURCE')).toBe(false);
    expect(() => AnalyticsSourceRegistryService.getLogicalSource('NON_EXISTENT_SOURCE')).toThrow(
      /Unrecognized logical source entity/
    );

    // Obsolete names must be rejected
    expect(AnalyticsSourceRegistryService.hasLogicalSource('work_logs')).toBe(false);
    expect(AnalyticsSourceRegistryService.hasLogicalSource('project_members')).toBe(false);
    expect(AnalyticsSourceRegistryService.hasLogicalSource('evaluation_records')).toBe(false);
  });

  it('4. Source spec validation — invalid field rejected', () => {
    expect(() =>
      AnalyticsSourceRegistryService.validateMetricSpec({
        sourceEntity: 'WORK_RECORD',
        targetColumn: 'non_existent_column',
      })
    ).toThrow(/Target column 'non_existent_column' is not permitted/);
  });

  it('5. Source spec validation — invalid filter dimension rejected', () => {
    expect(() =>
      AnalyticsSourceRegistryService.validateMetricSpec({
        sourceEntity: 'WORK_RECORD',
        filter: { invalid_dim: 'val' },
      })
    ).toThrow(/Filter field 'invalid_dim' is not permitted/);
  });

  it('6. Source spec validation — invalid relationship/join rejected', () => {
    expect(() =>
      AnalyticsSourceRegistryService.validateMetricSpec({
        sourceEntity: 'WORK_RECORD',
        join: {
          targetEntity: 'FINANCIAL_BUDGET',
          onField: 'id',
        },
      })
    ).toThrow(/Relationship between 'WORK_RECORD' and 'FINANCIAL_BUDGET' is not permitted/);
  });

  it('7. Metric definition input validation — valid definitions', () => {
    expect(() =>
      validateMetricDefinitionInput({
        name: 'Placement Rate',
        code: 'KPI_PLACEMENT_RATE',
        domainModule: 'learning',
        metricType: 'PERCENTAGE',
        calculationSpec: {
          numerator: {
            sourceEntity: 'LEARNING_ENROLLMENT',
            filter: { status: 'completed' },
          },
          denominator: {
            sourceEntity: 'LEARNING_ENROLLMENT',
            filter: { status: 'completed' },
          },
        },
        supportedDimensions: ['organization_id', 'learning_program_id', 'time_period'],
      })
    ).not.toThrow();

    expect(() =>
      validateMetricDefinitionInput({
        name: 'Total Revenue',
        code: 'KPI_REVENUE',
        domainModule: 'finance',
        metricType: 'SUM',
        calculationSpec: {
          sourceEntity: 'FINANCIAL_TRANSACTION',
          field: 'amount',
          filter: { direction: 'inflow', state: 'Posted' },
        },
        supportedDimensions: ['organization_id', 'category_id', 'time_period'],
      })
    ).not.toThrow();
  });

  it('8. Metric definition input validation — invalid inputs rejected', () => {
    // Missing name
    expect(() =>
      validateMetricDefinitionInput({
        name: '',
        code: 'CODE',
        domainModule: 'learning',
        metricType: 'COUNT',
        calculationSpec: { sourceEntity: 'TASK' },
      })
    ).toThrow(/Metric name is required/);

    // Invalid domain module
    expect(() =>
      validateMetricDefinitionInput({
        name: 'Test',
        code: 'TEST',
        domainModule: 'invalid_domain' as any,
        metricType: 'COUNT',
        calculationSpec: { sourceEntity: 'TASK' },
      })
    ).toThrow(/Invalid domainModule/);

    // Invalid metric type
    expect(() =>
      validateMetricDefinitionInput({
        name: 'Test',
        code: 'TEST',
        domainModule: 'projects',
        metricType: 'INVALID_TYPE' as any,
        calculationSpec: { sourceEntity: 'TASK' },
      })
    ).toThrow(/Invalid metricType/);

    // Unsupported dimension
    expect(() =>
      validateMetricDefinitionInput({
        name: 'Test',
        code: 'TEST',
        domainModule: 'projects',
        metricType: 'COUNT',
        calculationSpec: { sourceEntity: 'TASK' },
        supportedDimensions: ['invalid_dimension'],
      })
    ).toThrow(/Unsupported dimension/);
  });
});
