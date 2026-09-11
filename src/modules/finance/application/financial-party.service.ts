import { FinancialPartyRepository } from '../infrastructure/financial-party.repository.js';
import { FinancialParty, CreatePartyInput, UpdatePartyInput } from '../domain/financial-party.entity.js';
import { AuditService } from '../../../audit/audit.service.js';

export class FinancialPartyService {
  private repository: FinancialPartyRepository;

  constructor(repository?: FinancialPartyRepository) {
    this.repository = repository || new FinancialPartyRepository();
  }

  public async createParty(organizationId: string, input: CreatePartyInput, actorUserId?: string): Promise<FinancialParty> {
    const party = await this.repository.createParty(organizationId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCIAL_PARTY_CREATED',
      entityType: 'financial_party',
      entityId: party.id,
      payload: { name: party.name, partyType: party.partyType, personId: party.personId },
    });

    return party;
  }

  public async getParty(organizationId: string, partyId: string): Promise<FinancialParty> {
    return this.repository.getPartyById(organizationId, partyId);
  }

  public async listParties(organizationId: string): Promise<FinancialParty[]> {
    return this.repository.listParties(organizationId);
  }

  public async updateParty(
    organizationId: string,
    partyId: string,
    input: UpdatePartyInput,
    actorUserId?: string
  ): Promise<FinancialParty> {
    const updated = await this.repository.updateParty(organizationId, partyId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'FINANCIAL_PARTY_UPDATED',
      entityType: 'financial_party',
      entityId: partyId,
      payload: { name: updated.name },
    });

    return updated;
  }
}
