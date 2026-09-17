import { getDbClient } from '../../../database/index.js';
import { ValidationError, NotFoundError } from '../../../shared/errors/index.js';

export interface MeetingTargetResolverResult {
  valid: boolean;
  targetName?: string;
  assignable: boolean;
}

export interface MeetingTargetResolver {
  targetType: string;
  resolve(organizationId: string, targetId: string): Promise<MeetingTargetResolverResult>;
}

export class MeetingTargetResolverRegistry {
  private static instance: MeetingTargetResolverRegistry;
  private resolvers: Map<string, MeetingTargetResolver> = new Map();
  private supportedTargetTypes: Set<string> = new Set([
    'project',
    'business_unit',
    'department',
    'team',
  ]);

  private constructor() {
    this.registerDefaultResolvers();
  }

  public static getInstance(): MeetingTargetResolverRegistry {
    if (!MeetingTargetResolverRegistry.instance) {
      MeetingTargetResolverRegistry.instance = new MeetingTargetResolverRegistry();
    }
    return MeetingTargetResolverRegistry.instance;
  }

  public registerResolver(resolver: MeetingTargetResolver): void {
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
  ): Promise<MeetingTargetResolverResult> {
    if (!this.isSupportedType(targetType)) {
      throw new ValidationError(`Unsupported meeting target type: '${targetType}'`);
    }

    const resolver = this.resolvers.get(targetType);
    if (!resolver) {
      throw new ValidationError(
        `Meeting target type '${targetType}' has no active resolver registered`
      );
    }
    return resolver.resolve(organizationId, targetId);
  }

  private registerDefaultResolvers(): void {
    // 1. Project Meeting Target Resolver
    this.registerResolver({
      targetType: 'project',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string; status: string }>(
          `SELECT id, name, status FROM projects WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Project meeting target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });

    // 2. Business Unit Meeting Target Resolver
    this.registerResolver({
      targetType: 'business_unit',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string }>(
          `SELECT id, name FROM business_units WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Business unit meeting target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });

    // 3. Department Meeting Target Resolver
    this.registerResolver({
      targetType: 'department',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string }>(
          `SELECT id, name FROM departments WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Department meeting target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });

    // 4. Team Meeting Target Resolver
    this.registerResolver({
      targetType: 'team',
      resolve: async (organizationId: string, targetId: string) => {
        const db = getDbClient();
        const res = await db.query<{ id: string; name: string }>(
          `SELECT id, name FROM teams WHERE id = $1 AND organization_id = $2;`,
          [targetId, organizationId]
        );
        if (res.rows.length === 0) {
          throw new NotFoundError(`Team meeting target '${targetId}' not found in organization`);
        }
        return { valid: true, targetName: res.rows[0].name, assignable: true };
      },
    });
  }
}
