import { Request, Response, NextFunction } from 'express';
import { FinancialPartyService } from '../application/financial-party.service.js';
import { sendSuccess } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getOrgId = (req: Request): string => {
  const headerOrgId = req.headers['x-organization-id'];
  const paramOrgId = req.params.organizationId;
  const ctxOrgId = req.tenantContext?.organizationId;
  const orgId = (ctxOrgId || headerOrgId || paramOrgId) as string;
  if (!orgId) throw new ValidationError('Organization context is required');
  return Array.isArray(orgId) ? orgId[0] : orgId;
};

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class FinancialPartyController {
  private service: FinancialPartyService;

  constructor(service?: FinancialPartyService) {
    this.service = service || new FinancialPartyService();
  }

  public listParties = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const parties = await this.service.listParties(organizationId);
      sendSuccess(res, parties);
    } catch (err) {
      next(err);
    }
  };

  public createParty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const { party_type, partyType, person_id, personId, name, email, phone, tax_identifier, taxIdentifier, address, metadata } = req.body;

      const pType = partyType || party_type;
      const pId = personId || person_id;
      const tId = taxIdentifier || tax_identifier;

      if (!pType || !name) {
        throw new ValidationError('partyType and name are required');
      }

      const party = await this.service.createParty(
        organizationId,
        { partyType: pType, personId: pId, name, email, phone, taxIdentifier: tId, address, metadata },
        req.user?.id
      );

      sendSuccess(res, party, 201);
    } catch (err) {
      next(err);
    }
  };

  public getParty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const party = await this.service.getParty(organizationId, id);
      sendSuccess(res, party);
    } catch (err) {
      next(err);
    }
  };

  public updateParty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = getOrgId(req);
      const id = getParamId(req, 'id');
      const { name, email, phone, tax_identifier, taxIdentifier, address, metadata } = req.body;

      const tId = taxIdentifier || tax_identifier;
      const party = await this.service.updateParty(
        organizationId,
        id,
        { name, email, phone, taxIdentifier: tId, address, metadata },
        req.user?.id
      );

      sendSuccess(res, party);
    } catch (err) {
      next(err);
    }
  };
}
