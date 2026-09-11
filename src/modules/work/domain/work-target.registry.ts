import { getDbClient } from '../../../database/index.js';
import { ValidationError, NotFoundError } from '../../../shared/errors/index.js';

export interface WorkTargetResolverResult {
  valid: boolean;
  targetName?: string;
  assignable: boolean;
}

export interface WorkTargetResolver {
  targetType: string;
  resolve(organizationId: string, targetId: string): Promise<WorkTargetResolverResult>;
}

export class WorkTargetResolverRegistry {
  private static instance: WorkTargetResolverRegistry;
  private resolvers: Map<string, WorkTargetResolver> = new Map();
  private supportedTargetTypes: Set<string> = new Set([
    'project',
    'task',
    'business_unit',
    'department',
    'team',
  ]);

  private constructor() {
    this.registerDefaultResolvers();
  }

  public static getInstance(): WorkTargetResolverRegistry {
    if (!WorkTargetResolverRegistry.instance) {
      WorkTargetResolverRegistry.instance = new WorkTargetResolverRegistry();
    }
    return WorkTargetResolverRegistry.instance;
  }

  public registerResolver(resolver: WorkTargetResolver): void {
    this.supportedTargetTypes.add(resolver.targetType);
    this.resolvers.set(resolver.targetType, resolver);
  }

  public isSupportedType(targetType: string): boolean {
    return this.supportedTargetTypes.has(targetType);
  }

  public async resolveTarget(
    organizationId: string,
    targetType: string,
    targetId: string
  ): Promise<WorkTargetResolverResult> {
    if (!this.isSupportedType(targetType)) {
      throw new ValidationError(`Unsupported work target type: '${targetType}'`);
    }

    const resolver = this.resolvers.get(targetType);
    if (!resolver) {
      throw new ValidationError(
        `Work target type '${targetType}' has no active resolver registered`
      );
    }
    return resolver.resolve(organizationId, targetId);
  }

  private registerDefaultResolvers(): void {
    // 1. Project Work Target Resolver
    this.registerResolver({
      targetType: 'project',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string; status: string }>(
          `SELECT id, name, status FROM projects WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Project work target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });

    // 2. Task Work Target Resolver
    this.registerResolver({
      targetType: 'task',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; title: string; status: string }>(
          `SELECT id, title, status FROM tasks WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Task work target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].title, assignable: true };
      },
    });

    // 3. Business Unit Work Target Resolver
    this.registerResolver({
      targetType: 'business_unit',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string }>(
          `SELECT id, name FROM business_units WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Business unit work target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });

    // 4. Department Work Target Resolver
    this.registerResolver({
      targetType: 'department',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string }>(
          `SELECT id, name FROM departments WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Department work target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });

    // 5. Team Work Target Resolver
    this.registerResolver({
      targetType: 'team',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string }>(
          `SELECT id, name FROM teams WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Team work target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });
  }
}
