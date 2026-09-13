import { getDbClient } from '../../../database/index.js';
import { CandidateEntity, CandidateProps, CandidateStatus, CandidateSource } from '../domain/candidate.entity.js';

export class CandidateRepository {
  public static async create(entity: CandidateEntity, client?: any): Promise<CandidateEntity> {
    const db = client || getDbClient();
    const query = `
      INSERT INTO recruitment_candidates (
        id, organization_id, first_name, last_name, email, phone, source,
        source_details, resume_url, portfolio_url, skills, profile_metadata,
        internal_person_id, converted_person_id, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *;
    `;
    const res = await db.query(query, [
      entity.id,
      entity.organizationId,
      entity.firstName,
      entity.lastName,
      entity.email,
      entity.phone,
      entity.source,
      entity.sourceDetails,
      entity.resumeUrl,
      entity.portfolioUrl,
      entity.skills,
      JSON.stringify(entity.profileMetadata),
      entity.internalPersonId,
      entity.convertedPersonId,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    ]);
    return CandidateRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findById(organizationId: string, id: string, client?: any): Promise<CandidateEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_candidates WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (res.rows.length === 0) return null;
    return CandidateRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findByEmail(organizationId: string, email: string, client?: any): Promise<CandidateEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_candidates WHERE organization_id = $1 AND LOWER(email) = LOWER($2);`,
      [organizationId, email]
    );
    if (res.rows.length === 0) return null;
    return CandidateRepository.mapRowToEntity(res.rows[0]);
  }

  public static async list(
    organizationId: string,
    filters: {
      status?: CandidateStatus;
      source?: CandidateSource;
      search?: string;
    } = {}
  ): Promise<CandidateEntity[]> {
    const db = getDbClient();
    let query = `SELECT * FROM recruitment_candidates WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }
    if (filters.source) {
      params.push(filters.source);
      query += ` AND source = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows.map(CandidateRepository.mapRowToEntity);
  }

  public static async update(entity: CandidateEntity, client?: any): Promise<CandidateEntity> {
    const db = client || getDbClient();
    const query = `
      UPDATE recruitment_candidates SET
        first_name = $1, last_name = $2, email = $3, phone = $4, source = $5,
        source_details = $6, resume_url = $7, portfolio_url = $8, skills = $9,
        profile_metadata = $10, internal_person_id = $11, converted_person_id = $12,
        status = $13, updated_at = $14
      WHERE id = $15 AND organization_id = $16
      RETURNING *;
    `;
    const res = await db.query(query, [
      entity.firstName,
      entity.lastName,
      entity.email,
      entity.phone,
      entity.source,
      entity.sourceDetails,
      entity.resumeUrl,
      entity.portfolioUrl,
      entity.skills,
      JSON.stringify(entity.profileMetadata),
      entity.internalPersonId,
      entity.convertedPersonId,
      entity.status,
      entity.updatedAt,
      entity.id,
      entity.organizationId,
    ]);
    return CandidateRepository.mapRowToEntity(res.rows[0]);
  }

  private static mapRowToEntity(row: any): CandidateEntity {
    const props: CandidateProps = {
      id: row.id,
      organizationId: row.organization_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      source: row.source,
      sourceDetails: row.source_details,
      resumeUrl: row.resume_url,
      portfolioUrl: row.portfolio_url,
      skills: Array.isArray(row.skills) ? row.skills : [],
      profileMetadata: typeof row.profile_metadata === 'object' && row.profile_metadata !== null ? row.profile_metadata : {},
      internalPersonId: row.internal_person_id,
      convertedPersonId: row.converted_person_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return new CandidateEntity(props);
  }
}
