import { getDbClient } from '../../../database/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import {
  FinancialParty,
  CreatePartyInput,
  UpdatePartyInput,
  validatePartyType,
} from '../domain/financial-party.entity.js';

export class FinancialPartyRepository {
  public async createParty(organizationId: string, input: CreatePartyInput): Promise<FinancialParty> {
    const db = getDbClient();
    const pType = validatePartyType(input.partyType);

    if (input.personId) {
      const personRes = await db.query(
        `SELECT id FROM people WHERE id = $1 AND organization_id = $2;`,
        [input.personId, organizationId]
      );
      if (personRes.rows.length === 0) {
        throw new NotFoundError(`Person '${input.personId}' not found in organization`);
      }
    }

    const res = await db.query<any>(
      `INSERT INTO financial_parties (organization_id, party_type, person_id, name, email, phone, tax_identifier, address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *;`,
      [
        organizationId,
        pType,
        input.personId || null,
        input.name,
        input.email || null,
        input.phone || null,
        input.taxIdentifier || null,
        input.address || null,
        JSON.stringify(input.metadata || {}),
      ]
    );

    return this.mapPartyRow(res.rows[0]);
  }

  public async getPartyById(organizationId: string, partyId: string): Promise<FinancialParty> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM financial_parties WHERE id = $1 AND organization_id = $2;`,
      [partyId, organizationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Financial party '${partyId}' not found in organization`);
    }

    return this.mapPartyRow(res.rows[0]);
  }

  public async listParties(organizationId: string): Promise<FinancialParty[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM financial_parties WHERE organization_id = $1 ORDER BY name ASC;`,
      [organizationId]
    );
    return res.rows.map((r) => this.mapPartyRow(r));
  }

  public async updateParty(organizationId: string, partyId: string, input: UpdatePartyInput): Promise<FinancialParty> {
    const db = getDbClient();
    const existing = await this.getPartyById(organizationId, partyId);

    const newName = input.name !== undefined ? input.name : existing.name;
    const newEmail = input.email !== undefined ? input.email : existing.email;
    const newPhone = input.phone !== undefined ? input.phone : existing.phone;
    const newTax = input.taxIdentifier !== undefined ? input.taxIdentifier : existing.taxIdentifier;
    const newAddress = input.address !== undefined ? input.address : existing.address;
    const newMeta = input.metadata !== undefined ? input.metadata : existing.metadata;

    const res = await db.query<any>(
      `UPDATE financial_parties
       SET name = $1, email = $2, phone = $3, tax_identifier = $4, address = $5, metadata = $6, updated_at = NOW()
       WHERE id = $7 AND organization_id = $8
       RETURNING *;`,
      [
        newName,
        newEmail || null,
        newPhone || null,
        newTax || null,
        newAddress || null,
        JSON.stringify(newMeta || {}),
        partyId,
        organizationId,
      ]
    );

    return this.mapPartyRow(res.rows[0]);
  }

  private mapPartyRow(row: any): FinancialParty {
    return {
      id: row.id,
      organizationId: row.organization_id,
      partyType: row.party_type,
      personId: row.person_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      taxIdentifier: row.tax_identifier,
      address: row.address,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
