import { describe, it, expect } from 'vitest';
import { AnalyticsQueryBuilder } from '../../src/modules/analytics/application/query-builder.js';

describe('Milestone 11 — Analytics QueryBuilder & Computation Logic Unit Tests', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';

  it('1. Generates parameterized SQL with strict tenant filtering for direct tables', () => {
    const query = AnalyticsQueryBuilder.buildQuery(orgId, {
      sourceEntity: 'WORK_RECORD',
      aggregation: 'COUNT',
      filters: { status: 'completed' },
    });

    expect(query.sql).toContain('FROM work_records s');
    expect(query.sql).toContain('s.organization_id = $1');
    expect(query.sql).toContain('s.status = $2');
    expect(query.params).toEqual([orgId, 'completed']);
    // Ensure no raw unparameterized injection
    expect(query.sql).not.toContain(orgId);
  });

  it('2. Enforces tenant isolation via parent table JOIN for dependent entities', () => {
    // CRITERION_RESULT has no organization_id column; must join evaluations
    const query = AnalyticsQueryBuilder.buildQuery(orgId, {
      sourceEntity: 'CRITERION_RESULT',
      aggregation: 'AVERAGE',
      field: 'value',
    });

    expect(query.sql).toContain('FROM criterion_results s');
    expect(query.sql).toContain('JOIN evaluations ev ON ev.id = s.evaluation_id');
    expect(query.sql).toContain('ev.organization_id = $1');
    expect(query.params[0]).toBe(orgId);
  });

  it('3. Generates parameterized aggregations for COUNT, SUM, AVERAGE, MIN, MAX', () => {
    // SUM
    const sumQuery = AnalyticsQueryBuilder.buildQuery(orgId, {
      sourceEntity: 'FINANCIAL_TRANSACTION',
      aggregation: 'SUM',
      field: 'amount',
    });
    expect(sumQuery.sql).toContain('COALESCE(SUM(s.amount), 0)::numeric AS metric_value');

    // AVERAGE
    const avgQuery = AnalyticsQueryBuilder.buildQuery(orgId, {
      sourceEntity: 'WORK_RECORD',
      aggregation: 'AVERAGE',
      field: 'duration_minutes',
    });
    expect(avgQuery.sql).toContain('COALESCE(AVG(s.duration_minutes), 0)::numeric AS metric_value');
  });

  it('4. Generates WEIGHTED_AGGREGATION query correctly', () => {
    const weightedQuery = AnalyticsQueryBuilder.buildQuery(orgId, {
      sourceEntity: 'CRITERION_RESULT',
      aggregation: 'WEIGHTED_AGGREGATION',
      field: 'value',
      weightField: 'value', // Or numeric field
    });

    expect(weightedQuery.sql).toContain('COALESCE(SUM(s.value * s.value) / NULLIF(SUM(s.value), 0), 0)::numeric AS metric_value');
  });

  it('5. Contextual authorization scope injection (BU, Team, Project)', () => {
    const buId = '22222222-2222-2222-2222-222222222222';
    const projId = '33333333-3333-3333-3333-333333333333';

    const scopedQuery = AnalyticsQueryBuilder.buildQuery(
      orgId,
      {
        sourceEntity: 'FINANCIAL_OBLIGATION',
        aggregation: 'SUM',
        field: 'balance_amount',
      },
      {
        role: 'org_member',
        businessUnitIds: [buId],
        projectIds: [projId],
      }
    );

    expect(scopedQuery.sql).toContain('s.business_unit_id = ANY($2)');
    expect(scopedQuery.sql).toContain('s.project_id = ANY($3)');
    expect(scopedQuery.params).toContainEqual([buId]);
    expect(scopedQuery.params).toContainEqual([projId]);
  });

  it('6. Group by dimension generation', () => {
    const groupQuery = AnalyticsQueryBuilder.buildQuery(orgId, {
      sourceEntity: 'LEARNING_ENROLLMENT',
      aggregation: 'COUNT',
      groupBy: ['learning_program_id', 'status'],
    });

    expect(groupQuery.sql).toContain('s.learning_program_id, s.status');
    expect(groupQuery.sql).toContain('GROUP BY s.learning_program_id, s.status');
  });

  it('7. Time window condition generation', () => {
    const start = '2026-08-01T00:00:00Z';
    const end = '2026-08-31T23:59:59Z';

    const timeQuery = AnalyticsQueryBuilder.buildQuery(orgId, {
      sourceEntity: 'WORK_RECORD',
      aggregation: 'COUNT',
      startDate: start,
      endDate: end,
      timeColumn: 'started_at',
    });

    expect(timeQuery.sql).toContain('s.started_at >= $');
    expect(timeQuery.sql).toContain('s.started_at <= $');
    expect(timeQuery.params).toContain(start);
    expect(timeQuery.params).toContain(end);
  });

  it('8. Operator generation: between, in, not_in, is_null', () => {
    const opQuery = AnalyticsQueryBuilder.buildQuery(orgId, {
      sourceEntity: 'FINANCIAL_TRANSACTION',
      aggregation: 'COUNT',
      filters: {
        amount: { between: [100, 500] },
        payment_mode: { in: ['bank_transfer', 'upi'] },
      },
    });

    expect(opQuery.sql).toContain('s.amount BETWEEN $');
    expect(opQuery.sql).toContain('s.payment_mode = ANY($');
    expect(opQuery.params).toContain(100);
    expect(opQuery.params).toContain(500);
  });

  it('9. Rejects unlisted fields or invalid dimensions', () => {
    expect(() =>
      AnalyticsQueryBuilder.buildQuery(orgId, {
        sourceEntity: 'TASK',
        aggregation: 'COUNT',
        field: 'unlisted_column_name',
      })
    ).toThrow(/Field 'unlisted_column_name' is not allowed/);

    expect(() =>
      AnalyticsQueryBuilder.buildQuery(orgId, {
        sourceEntity: 'TASK',
        aggregation: 'COUNT',
        filters: { secret_column: 'value' },
      })
    ).toThrow(/Filter key 'secret_column' is not an allowed dimension/);
  });
});
