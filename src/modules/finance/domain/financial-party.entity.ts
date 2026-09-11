import { ValidationError } from '../../../shared/errors/index.js';

export type PartyType = 'person' | 'client' | 'vendor';

export interface FinancialParty {
  id: string;
  organizationId: string;
  partyType: PartyType;
  personId?: string;
  name: string;
  email?: string;
  phone?: string;
  taxIdentifier?: string;
  address?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePartyInput {
  partyType: PartyType;
  personId?: string;
  name: string;
  email?: string;
  phone?: string;
  taxIdentifier?: string;
  address?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePartyInput {
  name?: string;
  email?: string;
  phone?: string;
  taxIdentifier?: string;
  address?: string;
  metadata?: Record<string, any>;
}

export function validatePartyType(type: string): PartyType {
  const allowed: PartyType[] = ['person', 'client', 'vendor'];
  if (!allowed.includes(type as PartyType)) {
    throw new ValidationError(`Invalid party type: '${type}'. Must be one of: ${allowed.join(', ')}`);
  }
  return type as PartyType;
}
