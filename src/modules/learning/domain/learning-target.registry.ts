import { getDbClient } from '../../../database/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { TargetResolverRegistry } from '../../assignments/domain/target-resolver.registry.js';

export function registerLearningTargetResolvers(): void {
  const registry = TargetResolverRegistry.getInstance();

  // 1. Learning Program Resolver
  registry.registerResolver({
    targetType: 'learning_program',
    resolve: async (organizationId: string, targetId: string) => {
      const db = getDbClient();
      const res = await db.query<{ id: string; name: string }>(
        `SELECT id, name FROM learning_programs WHERE id = $1 AND organization_id = $2;`,
        [targetId, organizationId]
      );
      if (res.rows.length === 0) {
        throw new NotFoundError(`Learning program target '${targetId}' not found in organization`);
      }
      return { valid: true, targetName: res.rows[0].name, assignable: true };
    },
  });

  // 2. Learning Enrollment Resolver
  registry.registerResolver({
    targetType: 'learning_enrollment',
    resolve: async (organizationId: string, targetId: string) => {
      const db = getDbClient();
      const res = await db.query<{ id: string }>(
        `SELECT id FROM learning_enrollments WHERE id = $1 AND organization_id = $2;`,
        [targetId, organizationId]
      );
      if (res.rows.length === 0) {
        throw new NotFoundError(`Learning enrollment target '${targetId}' not found in organization`);
      }
      return { valid: true, targetName: `Enrollment ${res.rows[0].id}`, assignable: true };
    },
  });

  // 3. Student Target Resolver
  registry.registerResolver({
    targetType: 'student',
    resolve: async (organizationId: string, targetId: string) => {
      const db = getDbClient();
      // Student target can be a Person ID in the organization or an Enrollment ID
      const personRes = await db.query<{ id: string; first_name: string; last_name: string }>(
        `SELECT id, first_name, last_name FROM people WHERE id = $1 AND organization_id = $2;`,
        [targetId, organizationId]
      );
      if (personRes.rows.length > 0) {
        const p = personRes.rows[0];
        return { valid: true, targetName: `${p.first_name} ${p.last_name}`, assignable: true };
      }

      const enrollmentRes = await db.query<{ id: string }>(
        `SELECT id FROM learning_enrollments WHERE id = $1 AND organization_id = $2;`,
        [targetId, organizationId]
      );
      if (enrollmentRes.rows.length > 0) {
        return { valid: true, targetName: `Student Enrollment ${enrollmentRes.rows[0].id}`, assignable: true };
      }

      throw new NotFoundError(`Student target '${targetId}' not found in organization`);
    },
  });
}
