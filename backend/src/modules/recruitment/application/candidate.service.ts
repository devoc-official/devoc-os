import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../../../database/index.js';
import { CandidateEntity, CandidateStatus, CandidateSource } from '../domain/candidate.entity.js';
import { CandidateRepository } from '../infrastructure/candidate.repository.js';
import { RecruitmentTenantValidator } from '../infrastructure/recruitment-tenant.validator.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { NotFoundError, ConflictError } from '../../../shared/errors/index.js';

export interface CreateCandidateInput {
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  source?: CandidateSource;
  sourceDetails?: string | null;
  resumeUrl?: string | null;
  portfolioUrl?: string | null;
  skills?: string[];
  profileMetadata?: Record<string, unknown>;
  internalPersonId?: string | null;
  actorId?: string;
  requestId?: string;
}

export interface UpdateCandidateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  source?: CandidateSource;
  sourceDetails?: string | null;
  resumeUrl?: string | null;
  portfolioUrl?: string | null;
  skills?: string[];
  profileMetadata?: Record<string, unknown>;
  internalPersonId?: string | null;
  actorId?: string;
  requestId?: string;
}

export class CandidateService {
  public static async createCandidate(input: CreateCandidateInput): Promise<CandidateEntity> {
    if (input.internalPersonId) {
      await RecruitmentTenantValidator.validatePerson(input.organizationId, input.internalPersonId, 'Internal Person');
    }

    const existing = await CandidateRepository.findByEmail(input.organizationId, input.email);
    if (existing) {
      return existing;
    }

    const id = uuidv4();
    const now = new Date();
    const entity = new CandidateEntity({
      id,
      organizationId: input.organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      source: input.source ?? 'other',
      sourceDetails: input.sourceDetails ?? null,
      resumeUrl: input.resumeUrl ?? null,
      portfolioUrl: input.portfolioUrl ?? null,
      skills: input.skills ?? [],
      profileMetadata: input.profileMetadata ?? {},
      internalPersonId: input.internalPersonId ?? null,
      convertedPersonId: null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    const result = await withTransaction(async (tx) => {
      const saved = await CandidateRepository.create(entity, tx);

      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.candidate.created',
        entityType: 'Candidate',
        entityId: saved.id,
        afterState: { id: saved.id, email: saved.email, name: `${saved.firstName} ${saved.lastName}` },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.candidate.created',
        entityType: 'Candidate',
        entityId: saved.id,
        payload: { id: saved.id, email: saved.email },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async getCandidate(organizationId: string, id: string): Promise<CandidateEntity> {
    const candidate = await CandidateRepository.findById(organizationId, id);
    if (!candidate) {
      throw new NotFoundError(`Candidate '${id}' not found in organization`);
    }
    return candidate;
  }

  public static async listCandidates(
    organizationId: string,
    filters: {
      status?: CandidateStatus;
      source?: CandidateSource;
      search?: string;
    } = {}
  ): Promise<CandidateEntity[]> {
    return CandidateRepository.list(organizationId, filters);
  }

  public static async updateCandidate(
    organizationId: string,
    id: string,
    input: UpdateCandidateInput
  ): Promise<CandidateEntity> {
    const candidate = await CandidateService.getCandidate(organizationId, id);

    if (input.internalPersonId !== undefined && input.internalPersonId !== null) {
      await RecruitmentTenantValidator.validatePerson(organizationId, input.internalPersonId, 'Internal Person');
      candidate.internalPersonId = input.internalPersonId;
    }

    if (input.firstName !== undefined) candidate.firstName = input.firstName.trim();
    if (input.lastName !== undefined) candidate.lastName = input.lastName.trim();
    if (input.email !== undefined && input.email.trim().toLowerCase() !== candidate.email) {
      const emailDup = await CandidateRepository.findByEmail(organizationId, input.email);
      if (emailDup && emailDup.id !== candidate.id) {
        throw new ConflictError(`Another candidate with email '${input.email}' already exists in organization`);
      }
      candidate.email = input.email.trim().toLowerCase();
    }
    if (input.phone !== undefined) candidate.phone = input.phone?.trim() ?? null;
    if (input.source !== undefined) candidate.source = input.source;
    if (input.sourceDetails !== undefined) candidate.sourceDetails = input.sourceDetails;
    if (input.resumeUrl !== undefined) candidate.resumeUrl = input.resumeUrl;
    if (input.portfolioUrl !== undefined) candidate.portfolioUrl = input.portfolioUrl;
    if (input.skills !== undefined) candidate.skills = input.skills;
    if (input.profileMetadata !== undefined) candidate.profileMetadata = input.profileMetadata;
    candidate.updatedAt = new Date();

    const result = await withTransaction(async (tx) => {
      const saved = await CandidateRepository.update(candidate, tx);

      await AuditService.recordLog({
        organizationId,
        actorId: input.actorId,
        action: 'recruitment.candidate.updated',
        entityType: 'Candidate',
        entityId: saved.id,
        afterState: { id: saved.id, email: saved.email },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId,
        eventName: 'recruitment.candidate.updated',
        entityType: 'Candidate',
        entityId: saved.id,
        payload: { id: saved.id, email: saved.email },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }
}
