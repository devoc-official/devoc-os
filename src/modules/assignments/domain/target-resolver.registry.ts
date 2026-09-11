import { getDbClient } from '../../../database/index.js';
import { ValidationError, NotFoundError } from '../../../shared/errors/index.js';

export interface TargetResolverResult {
  valid: boolean;
  targetName?: string;
  assignable: boolean;
  reason?: string;
}

export interface TargetResolver {
  targetType: string;
  resolve(organizationId: string, targetId: string): Promise<TargetResolverResult>;
}

export class TargetResolverRegistry {
  private static instance: TargetResolverRegistry;
  private resolvers: Map<string, TargetResolver> = new Map();

  private constructor() {
    this.registerDefaultResolvers();
  }

  public static getInstance(): TargetResolverRegistry {
    if (!TargetResolverRegistry.instance) {
      TargetResolverRegistry.instance = new TargetResolverRegistry();
    }
    return TargetResolverRegistry.instance;
  }

  public registerResolver(resolver: TargetResolver): void {
    this.resolvers.set(resolver.targetType, resolver);
  }

  public isSupportedType(targetType: string): boolean {
    return this.resolvers.has(targetType);
  }

  public async resolveTarget(organizationId: string, targetType: string, targetId: string): Promise<TargetResolverResult> {
    const resolver = this.resolvers.get(targetType);
    if (!resolver) {
      throw new ValidationError(`Unsupported assignment target type: '${targetType}'`);
    }
    return resolver.resolve(organizationId, targetId);
  }

  private registerDefaultResolvers(): void {
    // 1. Business Unit Target Resolver
    this.registerResolver({
      targetType: 'business_unit',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string }>(
          `SELECT id, name FROM business_units WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Business unit target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });

    // 2. Department Target Resolver
    this.registerResolver({
      targetType: 'department',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string }>(
          `SELECT id, name FROM departments WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Department target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });

    // 3. Team Target Resolver
    this.registerResolver({
      targetType: 'team',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string }>(
          `SELECT id, name FROM teams WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Team target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });

    // Generic UUID format validator helper for non-M3 target domains
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const genericResolver = (type: string) => ({
      targetType: type,
      resolve: async (organizationId: string, targetId: string) => {
        if (!uuidRegex.test(targetId)) {
          throw new ValidationError(`Invalid target ID format for ${type}: '${targetId}'`);
        }
        return { valid: true, targetName: `${type}:${targetId}`, assignable: true };
      },
    });

    // 4. Project
    this.registerResolver(genericResolver('project'));
    // 5. Task
    this.registerResolver(genericResolver('task'));
    // 6. Learning Program
    this.registerResolver(genericResolver('learning_program'));
    // 7. Student
    this.registerResolver(genericResolver('student'));
  }
}
