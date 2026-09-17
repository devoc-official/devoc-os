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
  private supportedTargetTypes: Set<string> = new Set([
    'business_unit',
    'department',
    'team',
    'project',
    'task',
    'learning_program',
    'student',
    'unregistered_domain',
  ]);

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
    this.supportedTargetTypes.add(resolver.targetType);
    this.resolvers.set(resolver.targetType, resolver);
  }

  public isSupportedType(targetType: string): boolean {
    return this.supportedTargetTypes.has(targetType);
  }

  public async resolveTarget(organizationId: string, targetType: string, targetId: string): Promise<TargetResolverResult> {
    if (!this.isSupportedType(targetType)) {
      throw new ValidationError(`Unsupported assignment target type: '${targetType}'`);
    }

    const resolver = this.resolvers.get(targetType);
    if (!resolver) {
      throw new ValidationError(
        `Target type '${targetType}' is supported by DeVoc OS architecture, but its target domain module has not registered an active resolver`
      );
    }
    return resolver.resolve(organizationId, targetId);
  }

  private registerDefaultResolvers(): void {
    // 1. Business Unit Target Resolver (Database-backed)
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

    // 2. Department Target Resolver (Database-backed)
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

    // 3. Team Target Resolver (Database-backed)
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

    // Note: Future target types ('project', 'task', 'learning_program', 'student') are registered
    // as supported target types in supportedTargetTypes set, but do NOT have fallback UUID resolvers
    // that pretend arbitrary UUIDs exist. When those domain modules are built, they will register
    // their real database-backed resolvers via TargetResolverRegistry.getInstance().registerResolver(...).
  }
}
