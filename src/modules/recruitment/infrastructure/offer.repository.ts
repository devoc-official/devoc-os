import { getDbClient } from '../../../database/index.js';
import { OfferEntity, OfferProps, OfferStatus, CompensationFrequency } from '../domain/offer.entity.js';

export class OfferRepository {
  public static async create(entity: OfferEntity, client?: any): Promise<OfferEntity> {
    const db = client || getDbClient();
    const query = `
      INSERT INTO recruitment_offers (
        id, organization_id, application_id, position_id, proposed_role_id,
        employment_type, base_salary, currency, compensation_frequency, proposed_start_date,
        status, issued_at, expires_at, responded_at, response_notes, terms_conditions,
        financial_obligation_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *;
    `;
    const res = await db.query(query, [
      entity.id,
      entity.organizationId,
      entity.applicationId,
      entity.positionId,
      entity.proposedRoleId,
      entity.employmentType,
      entity.baseSalary,
      entity.currency,
      entity.compensationFrequency,
      entity.proposedStartDate,
      entity.status,
      entity.issuedAt,
      entity.expiresAt,
      entity.respondedAt,
      entity.responseNotes,
      entity.termsConditions,
      entity.financialObligationId,
      entity.createdAt,
      entity.updatedAt,
    ]);
    return OfferRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findById(organizationId: string, id: string, client?: any): Promise<OfferEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_offers WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );
    if (res.rows.length === 0) return null;
    return OfferRepository.mapRowToEntity(res.rows[0]);
  }

  public static async findActiveByApplicationId(organizationId: string, applicationId: string, client?: any): Promise<OfferEntity | null> {
    const db = client || getDbClient();
    const res = await db.query(
      `SELECT * FROM recruitment_offers
       WHERE organization_id = $1 AND application_id = $2
         AND status IN ('draft', 'issued');`,
      [organizationId, applicationId]
    );
    if (res.rows.length === 0) return null;
    return OfferRepository.mapRowToEntity(res.rows[0]);
  }

  public static async list(
    organizationId: string,
    filters: {
      applicationId?: string;
      positionId?: string;
      status?: OfferStatus;
    } = {}
  ): Promise<OfferEntity[]> {
    const db = getDbClient();
    let query = `SELECT * FROM recruitment_offers WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (filters.applicationId) {
      params.push(filters.applicationId);
      query += ` AND application_id = $${params.length}`;
    }
    if (filters.positionId) {
      params.push(filters.positionId);
      query += ` AND position_id = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows.map(OfferRepository.mapRowToEntity);
  }

  public static async update(entity: OfferEntity, client?: any): Promise<OfferEntity> {
    const db = client || getDbClient();
    const query = `
      UPDATE recruitment_offers SET
        proposed_role_id = $1, employment_type = $2, base_salary = $3, currency = $4,
        compensation_frequency = $5, proposed_start_date = $6, status = $7,
        issued_at = $8, expires_at = $9, responded_at = $10, response_notes = $11,
        terms_conditions = $12, financial_obligation_id = $13, updated_at = $14
      WHERE id = $15 AND organization_id = $16
      RETURNING *;
    `;
    const res = await db.query(query, [
      entity.proposedRoleId,
      entity.employmentType,
      entity.baseSalary,
      entity.currency,
      entity.compensationFrequency,
      entity.proposedStartDate,
      entity.status,
      entity.issuedAt,
      entity.expiresAt,
      entity.respondedAt,
      entity.responseNotes,
      entity.termsConditions,
      entity.financialObligationId,
      entity.updatedAt,
      entity.id,
      entity.organizationId,
    ]);
    return OfferRepository.mapRowToEntity(res.rows[0]);
  }

  private static mapRowToEntity(row: any): OfferEntity {
    const props: OfferProps = {
      id: row.id,
      organizationId: row.organization_id,
      applicationId: row.application_id,
      positionId: row.position_id,
      proposedRoleId: row.proposed_role_id,
      employmentType: row.employment_type,
      baseSalary: parseFloat(row.base_salary),
      currency: row.currency,
      compensationFrequency: row.compensation_frequency as CompensationFrequency,
      proposedStartDate: row.proposed_start_date,
      status: row.status as OfferStatus,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      respondedAt: row.responded_at,
      responseNotes: row.response_notes,
      termsConditions: row.terms_conditions,
      financialObligationId: row.financial_obligation_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return new OfferEntity(props);
  }
}
