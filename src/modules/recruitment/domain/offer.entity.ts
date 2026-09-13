import { ValidationError } from '../../../shared/errors/index.js';
import { OfferStateError } from './recruitment.errors.js';

export type OfferStatus = 'draft' | 'issued' | 'accepted' | 'rejected' | 'rescinded' | 'expired';
export type CompensationFrequency = 'hourly' | 'monthly' | 'annual' | 'milestone';

export interface OfferProps {
  id: string;
  organizationId: string;
  applicationId: string;
  positionId: string;
  proposedRoleId?: string | null;
  employmentType: string;
  baseSalary: number;
  currency: string;
  compensationFrequency: CompensationFrequency;
  proposedStartDate: Date | string;
  status: OfferStatus;
  issuedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  respondedAt?: Date | string | null;
  responseNotes?: string | null;
  termsConditions?: string | null;
  financialObligationId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class OfferEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly applicationId: string;
  public readonly positionId: string;
  public proposedRoleId: string | null;
  public employmentType: string;
  public baseSalary: number;
  public currency: string;
  public compensationFrequency: CompensationFrequency;
  public proposedStartDate: Date;
  public status: OfferStatus;
  public issuedAt: Date | null;
  public expiresAt: Date | null;
  public respondedAt: Date | null;
  public responseNotes: string | null;
  public termsConditions: string | null;
  public financialObligationId: string | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: OfferProps) {
    this.validate(props);
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.applicationId = props.applicationId;
    this.positionId = props.positionId;
    this.proposedRoleId = props.proposedRoleId ?? null;
    this.employmentType = props.employmentType;
    this.baseSalary = props.baseSalary;
    this.currency = props.currency ?? 'USD';
    this.compensationFrequency = props.compensationFrequency;
    this.proposedStartDate = new Date(props.proposedStartDate);
    this.status = props.status;
    this.issuedAt = props.issuedAt ? new Date(props.issuedAt) : null;
    this.expiresAt = props.expiresAt ? new Date(props.expiresAt) : null;
    this.respondedAt = props.respondedAt ? new Date(props.respondedAt) : null;
    this.responseNotes = props.responseNotes ?? null;
    this.termsConditions = props.termsConditions ?? null;
    this.financialObligationId = props.financialObligationId ?? null;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  private validate(props: OfferProps): void {
    if (!props.applicationId) {
      throw new ValidationError('Application ID is required for employment offer');
    }
    if (!props.positionId) {
      throw new ValidationError('Position ID is required for employment offer');
    }
    if (props.baseSalary < 0) {
      throw new ValidationError('Base salary cannot be negative');
    }
    const startDate = new Date(props.proposedStartDate);
    if (isNaN(startDate.getTime())) {
      throw new ValidationError('Valid proposed start date is required');
    }
  }

  public isTerminal(): boolean {
    return (
      this.status === 'accepted' ||
      this.status === 'rejected' ||
      this.status === 'rescinded' ||
      this.status === 'expired'
    );
  }

  public issue(expiresAt?: Date | string | null): void {
    if (this.status !== 'draft') {
      throw new OfferStateError(`Cannot issue offer in status '${this.status}'`);
    }
    this.status = 'issued';
    this.issuedAt = new Date();
    if (expiresAt) {
      this.expiresAt = new Date(expiresAt);
    }
    this.updatedAt = new Date();
  }

  public accept(notes?: string | null): void {
    if (this.status !== 'issued') {
      throw new OfferStateError(`Only issued offers can be accepted, current status is '${this.status}'`);
    }
    this.status = 'accepted';
    this.respondedAt = new Date();
    this.responseNotes = notes ?? null;
    this.updatedAt = new Date();
  }

  public reject(notes?: string | null): void {
    if (this.status !== 'issued') {
      throw new OfferStateError(`Only issued offers can be rejected, current status is '${this.status}'`);
    }
    this.status = 'rejected';
    this.respondedAt = new Date();
    this.responseNotes = notes ?? null;
    this.updatedAt = new Date();
  }

  public rescind(notes?: string | null): void {
    if (this.isTerminal()) {
      throw new OfferStateError(`Cannot rescind offer in terminal status '${this.status}'`);
    }
    this.status = 'rescinded';
    this.respondedAt = new Date();
    this.responseNotes = notes ?? null;
    this.updatedAt = new Date();
  }

  public expire(): void {
    if (this.status !== 'issued') {
      throw new OfferStateError(`Only issued offers can expire, current status is '${this.status}'`);
    }
    this.status = 'expired';
    this.respondedAt = new Date();
    this.updatedAt = new Date();
  }
}
