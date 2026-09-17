import { getDbClient } from '../../../database/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';

export class RecruitmentTenantValidator {
  public static async validateBusinessUnit(organizationId: string, businessUnitId?: string | null): Promise<void> {
    if (!businessUnitId) return;
    const db = getDbClient();
    const res = await db.query(
      `SELECT id FROM business_units WHERE id = $1 AND organization_id = $2;`,
      [businessUnitId, organizationId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundError(`Business unit '${businessUnitId}' not found in organization`);
    }
  }

  public static async validateDepartment(organizationId: string, departmentId?: string | null): Promise<void> {
    if (!departmentId) return;
    const db = getDbClient();
    const res = await db.query(
      `SELECT id FROM departments WHERE id = $1 AND organization_id = $2;`,
      [departmentId, organizationId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundError(`Department '${departmentId}' not found in organization`);
    }
  }

  public static async validateTeam(organizationId: string, teamId?: string | null): Promise<void> {
    if (!teamId) return;
    const db = getDbClient();
    const res = await db.query(
      `SELECT id FROM teams WHERE id = $1 AND organization_id = $2;`,
      [teamId, organizationId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundError(`Team '${teamId}' not found in organization`);
    }
  }

  public static async validateRole(organizationId: string, roleId?: string | null): Promise<void> {
    if (!roleId) return;
    const db = getDbClient();
    const res = await db.query(
      `SELECT id FROM roles WHERE id = $1 AND organization_id = $2;`,
      [roleId, organizationId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundError(`Role '${roleId}' not found in organization`);
    }
  }

  public static async validatePerson(organizationId: string, personId?: string | null, label: string = 'Person'): Promise<void> {
    if (!personId) return;
    const db = getDbClient();
    const res = await db.query(
      `SELECT id FROM people WHERE id = $1 AND organization_id = $2;`,
      [personId, organizationId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundError(`${label} '${personId}' not found in organization`);
    }
  }

  public static async validatePosition(organizationId: string, positionId: string): Promise<void> {
    const db = getDbClient();
    const res = await db.query(
      `SELECT id FROM recruitment_positions WHERE id = $1 AND organization_id = $2;`,
      [positionId, organizationId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundError(`Position '${positionId}' not found in organization`);
    }
  }

  public static async validateCandidate(organizationId: string, candidateId: string): Promise<void> {
    const db = getDbClient();
    const res = await db.query(
      `SELECT id FROM recruitment_candidates WHERE id = $1 AND organization_id = $2;`,
      [candidateId, organizationId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundError(`Candidate '${candidateId}' not found in organization`);
    }
  }

  public static async validatePipelineStage(organizationId: string, stageId: string): Promise<void> {
    const db = getDbClient();
    const res = await db.query(
      `SELECT id FROM recruitment_pipeline_stages WHERE id = $1 AND organization_id = $2;`,
      [stageId, organizationId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundError(`Pipeline stage '${stageId}' not found in organization`);
    }
  }

  public static async validateApplication(organizationId: string, applicationId: string): Promise<void> {
    const db = getDbClient();
    const res = await db.query(
      `SELECT id FROM recruitment_applications WHERE id = $1 AND organization_id = $2;`,
      [applicationId, organizationId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundError(`Application '${applicationId}' not found in organization`);
    }
  }
}
