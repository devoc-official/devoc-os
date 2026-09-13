import { ValidationError } from '../../../shared/errors/index.js';

export type CandidateStatus = 'active' | 'hired' | 'archived';
export type CandidateSource = 'career_page' | 'job_board' | 'referral' | 'campus' | 'agency' | 'internal' | 'direct' | 'other';

export interface CandidateProps {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  source: CandidateSource;
  sourceDetails?: string | null;
  resumeUrl?: string | null;
  portfolioUrl?: string | null;
  skills?: string[];
  profileMetadata?: Record<string, unknown>;
  internalPersonId?: string | null;
  convertedPersonId?: string | null;
  status: CandidateStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class CandidateEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public firstName: string;
  public lastName: string;
  public email: string;
  public phone: string | null;
  public source: CandidateSource;
  public sourceDetails: string | null;
  public resumeUrl: string | null;
  public portfolioUrl: string | null;
  public skills: string[];
  public profileMetadata: Record<string, unknown>;
  public internalPersonId: string | null;
  public convertedPersonId: string | null;
  public status: CandidateStatus;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: CandidateProps) {
    this.validate(props);
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.firstName = props.firstName.trim();
    this.lastName = props.lastName.trim();
    this.email = props.email.trim().toLowerCase();
    this.phone = props.phone?.trim() ?? null;
    this.source = props.source;
    this.sourceDetails = props.sourceDetails ?? null;
    this.resumeUrl = props.resumeUrl ?? null;
    this.portfolioUrl = props.portfolioUrl ?? null;
    this.skills = props.skills ?? [];
    this.profileMetadata = props.profileMetadata ?? {};
    this.internalPersonId = props.internalPersonId ?? null;
    this.convertedPersonId = props.convertedPersonId ?? null;
    this.status = props.status;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  private validate(props: CandidateProps): void {
    if (!props.firstName || props.firstName.trim() === '') {
      throw new ValidationError('Candidate first name is required');
    }
    if (!props.lastName || props.lastName.trim() === '') {
      throw new ValidationError('Candidate last name is required');
    }
    if (!props.email || props.email.trim() === '') {
      throw new ValidationError('Candidate email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(props.email.trim())) {
      throw new ValidationError('Invalid candidate email format');
    }
  }

  public markHired(convertedPersonId: string): void {
    if (!convertedPersonId) {
      throw new ValidationError('Converted person ID is required when marking candidate hired');
    }
    this.status = 'hired';
    this.convertedPersonId = convertedPersonId;
    this.updatedAt = new Date();
  }

  public archive(): void {
    this.status = 'archived';
    this.updatedAt = new Date();
  }
}
