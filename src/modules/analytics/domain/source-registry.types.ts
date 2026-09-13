export type DomainModule =
  | 'organization'
  | 'people'
  | 'assignments'
  | 'projects'
  | 'work'
  | 'meetings'
  | 'learning'
  | 'evaluation'
  | 'finance';

export type MetricType =
  | 'COUNT'
  | 'SUM'
  | 'AVERAGE'
  | 'RATE'
  | 'PERCENTAGE'
  | 'WEIGHTED_AGGREGATION'
  | 'TREND';

export type AggregationType = MetricType;

export type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'between'
  | 'is_null'
  | 'is_not_null';

export const ALLOWED_OPERATORS: FilterOperator[] = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'between',
  'is_null',
  'is_not_null',
];

export const ALLOWED_AGGREGATIONS: AggregationType[] = [
  'COUNT',
  'SUM',
  'AVERAGE',
  'RATE',
  'PERCENTAGE',
  'WEIGHTED_AGGREGATION',
  'TREND',
];

export const ALLOWED_DIMENSIONS: string[] = [
  'organization_id',
  'branch_id',
  'business_unit_id',
  'department_id',
  'team_id',
  'person_id',
  'role_id',
  'project_id',
  'task_id',
  'learning_program_id',
  'template_id',
  'category_id',
  'meeting_type_id',
  'time_period',
];

export type LogicalSourceIdentifier =
  | 'ORGANIZATION'
  | 'USER'
  | 'ORGANIZATION_MEMBERSHIP'
  | 'BRANCH'
  | 'BUSINESS_UNIT'
  | 'DEPARTMENT'
  | 'TEAM'
  | 'PERSON'
  | 'ROLE'
  | 'PERSON_ROLE'
  | 'EMPLOYMENT'
  | 'EMPLOYMENT_HISTORY'
  | 'SKILL'
  | 'PERSON_SKILL'
  | 'ASSIGNMENT'
  | 'ASSIGNMENT_HISTORY'
  | 'PROJECT'
  | 'PROJECT_OWNER'
  | 'PROJECT_BUSINESS_UNIT'
  | 'TASK'
  | 'TASK_DEPENDENCY'
  | 'WORK_CATEGORY'
  | 'WORK_RECORD'
  | 'WORK_EVIDENCE'
  | 'OUTCOME'
  | 'WORK_OUTCOME'
  | 'MEETING_TYPE'
  | 'MEETING'
  | 'MEETING_TARGET'
  | 'MEETING_PARTICIPANT'
  | 'MEETING_AGENDA_ITEM'
  | 'MEETING_NOTE'
  | 'MEETING_DECISION'
  | 'MEETING_ACTION_ITEM'
  | 'LEARNING_PROGRAM'
  | 'LEARNING_PROGRAM_MILESTONE'
  | 'LEARNING_ACTIVITY_DEFINITION'
  | 'LEARNING_ENROLLMENT'
  | 'ENROLLMENT_MILESTONE'
  | 'LEARNING_ACTIVITY'
  | 'LEARNING_ACTIVITY_REFERENCE'
  | 'LEARNING_REVIEW'
  | 'LEARNING_REVIEW_CHANGE'
  | 'LEARNING_ASSESSMENT'
  | 'LEARNING_ASSESSMENT_ATTEMPT'
  | 'EVALUATION_TEMPLATE'
  | 'EVALUATION_CRITERION'
  | 'EVALUATION'
  | 'EVALUATION_EVALUATOR'
  | 'CRITERION_RESULT'
  | 'EVALUATION_FEEDBACK'
  | 'EVALUATION_OUTCOME'
  | 'EVALUATION_HISTORY'
  | 'FINANCE_CATEGORY'
  | 'FINANCIAL_PARTY'
  | 'FINANCIAL_OBLIGATION'
  | 'FINANCIAL_OBLIGATION_ITEM'
  | 'FINANCIAL_TRANSACTION'
  | 'FINANCIAL_ALLOCATION'
  | 'FINANCIAL_ADJUSTMENT'
  | 'FINANCIAL_BUDGET'
  | 'AUDIT_LOG'
  | 'EVENT_OUTBOX'
  | 'EVENT_CONSUMER_RECORD'
  | 'EVENT_REGISTRY';

export interface RelationshipDefinition {
  targetEntity: string;
  onField: string;
  foreignField?: string;
}

export interface LogicalSourceDefinition {
  logicalSource: string;
  physicalTable: string;
  primaryKey: string | string[];
  tenantColumn: string | null;
  parentJoin?: {
    targetEntity: string;
    onField: string;
    foreignField: string;
  };
  allowedFields: string[];
  allowedDimensions: string[];
  allowedRelationships: Record<string, RelationshipDefinition>;
  allowedAggregations: AggregationType[];
}

export interface MetricFilterCondition {
  operator: FilterOperator;
  value?: unknown;
}

export type MetricFilter = Record<string, unknown | MetricFilterCondition>;

export interface SingleSourceCalculationSpec {
  sourceEntity: string;
  targetColumn?: string;
  filter?: MetricFilter;
  join?: {
    targetEntity: string;
    onField: string;
  };
}

export interface RatioCalculationSpec {
  numerator: SingleSourceCalculationSpec;
  denominator: SingleSourceCalculationSpec;
}

export interface CalculationSpec {
  metricType?: MetricType;
  sourceEntity?: string;
  targetColumn?: string;
  filter?: MetricFilter;
  join?: {
    targetEntity: string;
    onField: string;
  };
  numerator?: SingleSourceCalculationSpec;
  denominator?: SingleSourceCalculationSpec;
  weights?: Record<string, number>;
  trendInterval?: 'day' | 'week' | 'month';
}
