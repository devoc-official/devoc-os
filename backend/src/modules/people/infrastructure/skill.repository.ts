import { getDbClient } from '../../../database/index.js';
import { ProficiencyLevel } from '../domain/role-skill.entity.js';

export interface SkillRecord {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  category?: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonSkillRecord {
  id: string;
  organizationId: string;
  personId: string;
  skillId: string;
  skillName?: string;
  skillCode?: string;
  proficiencyLevel: ProficiencyLevel;
  createdAt: Date;
  updatedAt: Date;
}

export class SkillRepository {
  public static async createSkill(data: {
    organizationId: string;
    name: string;
    code: string;
    category?: string | null;
    status?: 'active' | 'inactive';
  }): Promise<SkillRecord> {
    const db = getDbClient();
    const status = data.status || 'active';
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      category: string | null;
      status: 'active' | 'inactive';
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO skills (organization_id, name, code, category, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, organization_id, name, code, category, status, created_at, updated_at;`,
      [data.organizationId, data.name.trim(), data.code.toUpperCase().trim(), data.category || null, status]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async findSkillById(organizationId: string, id: string): Promise<SkillRecord | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      category: string | null;
      status: 'active' | 'inactive';
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, category, status, created_at, updated_at
       FROM skills
       WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listSkills(organizationId: string): Promise<SkillRecord[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      name: string;
      code: string;
      category: string | null;
      status: 'active' | 'inactive';
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, organization_id, name, code, category, status, created_at, updated_at
       FROM skills
       WHERE organization_id = $1
       ORDER BY name ASC;`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      code: row.code,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async assignPersonSkill(data: {
    organizationId: string;
    personId: string;
    skillId: string;
    proficiencyLevel: ProficiencyLevel;
  }): Promise<PersonSkillRecord> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      person_id: string;
      skill_id: string;
      proficiency_level: ProficiencyLevel;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO person_skills (organization_id, person_id, skill_id, proficiency_level)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (person_id, skill_id) DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level, updated_at = NOW()
       RETURNING id, organization_id, person_id, skill_id, proficiency_level, created_at, updated_at;`,
      [data.organizationId, data.personId, data.skillId, data.proficiencyLevel]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      skillId: row.skill_id,
      proficiencyLevel: row.proficiency_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static async listPersonSkills(organizationId: string, personId: string): Promise<PersonSkillRecord[]> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      organization_id: string;
      person_id: string;
      skill_id: string;
      skill_name: string;
      skill_code: string;
      proficiency_level: ProficiencyLevel;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT ps.id, ps.organization_id, ps.person_id, ps.skill_id, s.name AS skill_name, s.code AS skill_code,
              ps.proficiency_level, ps.created_at, ps.updated_at
       FROM person_skills ps
       JOIN skills s ON s.id = ps.skill_id
       WHERE ps.organization_id = $1 AND ps.person_id = $2
       ORDER BY s.name ASC;`,
      [organizationId, personId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      personId: row.person_id,
      skillId: row.skill_id,
      skillName: row.skill_name,
      skillCode: row.skill_code,
      proficiencyLevel: row.proficiency_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async removePersonSkill(organizationId: string, id: string): Promise<boolean> {
    const db = getDbClient();
    const res = await db.query(
      `DELETE FROM person_skills WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    return res.rowCount > 0;
  }
}
