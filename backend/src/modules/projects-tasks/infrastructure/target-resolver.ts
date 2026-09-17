import { getDbClient } from '../../../database/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { TargetResolverRegistry } from '../../assignments/domain/target-resolver.registry.js';

export function registerProjectTaskTargetResolvers(): void {
  const registry = TargetResolverRegistry.getInstance();

  // 1. Project Target Resolver
  registry.registerResolver({
    targetType: 'project',
    resolve: async (organizationId: string, targetId: string) => {
      const db = getDbClient();
      const res = await db.query<{ id: string; name: string }>(
        `SELECT id, name FROM projects WHERE id = $1 AND organization_id = $2;`,
        [targetId, organizationId]
      );
      if (res.rows.length === 0) {
        throw new NotFoundError(`Project target '${targetId}' not found in organization`);
      }
      return { valid: true, targetName: res.rows[0].name, assignable: true };
    },
  });

  // 2. Task Target Resolver
  registry.registerResolver({
    targetType: 'task',
    resolve: async (organizationId: string, targetId: string) => {
      const db = getDbClient();
      const res = await db.query<{ id: string; title: string }>(
        `SELECT id, title FROM tasks WHERE id = $1 AND organization_id = $2;`,
        [targetId, organizationId]
      );
      if (res.rows.length === 0) {
        throw new NotFoundError(`Task target '${targetId}' not found in organization`);
      }
      return { valid: true, targetName: res.rows[0].title, assignable: true };
    },
  });
}
