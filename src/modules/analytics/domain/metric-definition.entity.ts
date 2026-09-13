import { ValidationError } from '../../../shared/errors/index.js';
import {
  LogicalSourceIdentifier,
  ANALYTICS_SOURCE_REGISTRY,
  ALLOWED_OPERATORS,
  ALLOWED_AGGREGATIONS,
  ALLOWED_DIMENSIONS,
} from './source-registry.js';

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
  | 'MIN'
  | 'MAX'
  | 'RATE'
  | 'PERCENTAGE'
  | 'WEIGHTED_AGGREGATION'
  | 'TREND';

export interface SingleSourceSpec {
  sourceEntity: LogicalSourceIdentifier;
  field?: string;
  filter?: Record<string, any>;
  aggregation?: MetricType;
}

export interface RatioSourceSpec {
  numerator: SingleSourceSpec;
  denominator: SingleSourceSpec;
}

export interface WeightedAggregationSpec {
  sourceEntity: LogicalSourceIdentifier;
  valueField?: string;
  weightField?: string;
  filter?: Record<string, any>;
}

export interface TrendSpec {
  sourceEntity: LogicalSourceIdentifier;
  field?: string;
  timeDimension?: string;
  filter?: Record<string, any>;
  aggregation?: MetricType;
}

export type CalculationSpec =
  | SingleSourceSpec
  | RatioSourceSpec
  | WeightedAggregationSpec
  | TrendSpec
  | Record<string, any>;

export interface MetricDefinition {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  domainModule: DomainModule;
  metricType: MetricType;
  calculationSpec: CalculationSpec;
  supportedDimensions: string[];
  createdBy?: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateMetricDefinitionInput {
  name: string;
  code: string;
  domainModule: DomainModule;
  metricType: MetricType;
  calculationSpec: CalculationSpec;
  supportedDimensions?: string[];
  isActive?: boolean;
}

export interface UpdateMetricDefinitionInput {
  name?: string;
  domainModule?: DomainModule;
  metricType?: MetricType;
  calculationSpec?: CalculationSpec;
  supportedDimensions?: string[];
  isActive?: boolean;
}

const ALLOWED_DOMAIN_MODULES: DomainModule[] = [
  'organization',
  'people',
  'assignments',
  'projects',
  'work',
  'meetings',
  'learning',
  'evaluation',
  'finance',
];

export function validateCalculationSource(
  source: SingleSourceSpec,
  parentPath: string = 'calculationSpec'
): void {
  if (!source || typeof source !== 'object') {
    throw new ValidationError(`${parentPath} must be an object`);
  }

  if (!source.sourceEntity) {
    throw new ValidationError(`${parentPath}.sourceEntity is required`);
  }

  const registeredSource = ANALYTICS_SOURCE_REGISTRY[source.sourceEntity];
  if (!registeredSource) {
    throw new ValidationError(
      `Unknown or disallowed source entity '${source.sourceEntity}' at ${parentPath}.sourceEntity`
    );
  }

  if (source.field) {
    if (!registeredSource.allowedDimensions.includes(source.field)) {
      throw new ValidationError(
        `Field '${source.field}' is not allowed on source '${source.sourceEntity}' at ${parentPath}.field`
      );
    }
  }

  if (source.aggregation) {
    if (!ALLOWED_AGGREGATIONS.includes(source.aggregation)) {
      throw new ValidationError(
        `Aggregation '${source.aggregation}' is not allowed at ${parentPath}.aggregation`
      );
    }
    if (!registeredSource.allowedAggregations.includes(source.aggregation)) {
      throw new ValidationError(
        `Source '${source.sourceEntity}' does not permit aggregation '${source.aggregation}'`
      );
    }
  }

  if (source.filter && typeof source.filter === 'object') {
    for (const [key, value] of Object.entries(source.filter)) {
      if (!registeredSource.allowedDimensions.includes(key)) {
        throw new ValidationError(
          `Filter key '${key}' is not an allowed dimension on source '${source.sourceEntity}'`
        );
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const op of Object.keys(value)) {
          if (!ALLOWED_OPERATORS.includes(op as any)) {
            throw new ValidationError(`Disallowed filter operator '${op}' at ${parentPath}.filter.${key}`);
          }
        }
      }
    }
  }

  if ((source as any).join) {
    const join = (source as any).join;
    const rel = registeredSource.allowedRelationships[join.targetEntity];
    if (!rel) {
      throw new ValidationError(
        `Relationship between '${source.sourceEntity}' and '${join.targetEntity}' is not permitted in source registry`
      );
    }
  }
}

export function validateMetricDefinitionInput(input: CreateMetricDefinitionInput): void {
  if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
    throw new ValidationError('Metric name is required and cannot be empty');
  }

  if (!input.code || typeof input.code !== 'string' || input.code.trim().length === 0) {
    throw new ValidationError('Metric code is required and cannot be empty');
  }

  if (!ALLOWED_DOMAIN_MODULES.includes(input.domainModule)) {
    throw new ValidationError(
      `Invalid domainModule '${input.domainModule}'. Allowed: ${ALLOWED_DOMAIN_MODULES.join(', ')}`
    );
  }

  if (!ALLOWED_AGGREGATIONS.includes(input.metricType)) {
    throw new ValidationError(
      `Invalid metricType '${input.metricType}'. Allowed: ${ALLOWED_AGGREGATIONS.join(', ')}`
    );
  }

  if (!input.calculationSpec || typeof input.calculationSpec !== 'object') {
    throw new ValidationError('calculationSpec is required and must be an object');
  }

  // Validate supported dimensions
  if (input.supportedDimensions) {
    if (!Array.isArray(input.supportedDimensions)) {
      throw new ValidationError('supportedDimensions must be an array of strings');
    }
    for (const dim of input.supportedDimensions) {
      if (!ALLOWED_DIMENSIONS.includes(dim)) {
        throw new ValidationError(`Unsupported dimension '${dim}' in supportedDimensions`);
      }
    }
  }

  // Validate calculationSpec
  const spec = input.calculationSpec as any;
  if (spec.numerator || spec.denominator) {
    if (!spec.numerator || !spec.denominator) {
      throw new ValidationError(
        'Ratio/percentage metrics require both numerator and denominator in calculationSpec'
      );
    }
    validateCalculationSource(spec.numerator, 'calculationSpec.numerator');
    validateCalculationSource(spec.denominator, 'calculationSpec.denominator');
  } else if (spec.sourceEntity) {
    validateCalculationSource(spec, 'calculationSpec');
  } else {
    throw new ValidationError(
      'calculationSpec must specify either sourceEntity or both numerator and denominator'
    );
  }
}
