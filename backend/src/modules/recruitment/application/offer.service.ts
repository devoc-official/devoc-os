import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../../../database/index.js';
import { OfferEntity, OfferStatus, CompensationFrequency } from '../domain/offer.entity.js';
import { OfferRepository } from '../infrastructure/offer.repository.js';
import { ApplicationRepository } from '../infrastructure/application.repository.js';
import { RecruitmentTenantValidator } from '../infrastructure/recruitment-tenant.validator.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../../../shared/errors/index.js';

export interface CreateOfferInput {
  organizationId: string;
  applicationId: string;
  proposedRoleId?: string | null;
  employmentType?: string;
  baseSalary: number;
  currency?: string;
  compensationFrequency?: CompensationFrequency;
  proposedStartDate: Date | string;
  expiresAt?: Date | string | null;
  termsConditions?: string | null;
  financialObligationId?: string | null;
  actorId?: string;
  requestId?: string;
}

export interface RespondOfferInput {
  organizationId: string;
  offerId: string;
  responseNotes?: string | null;
  actorId?: string;
  requestId?: string;
}

export class OfferService {
  public static async createOffer(input: CreateOfferInput): Promise<OfferEntity> {
    await RecruitmentTenantValidator.validateApplication(input.organizationId, input.applicationId);
    await RecruitmentTenantValidator.validateRole(input.organizationId, input.proposedRoleId);

    const app = await ApplicationRepository.findById(input.organizationId, input.applicationId);
    if (!app) {
      throw new NotFoundError(`Application '${input.applicationId}' not found in organization`);
    }

    const existingActive = await OfferRepository.findActiveByApplicationId(input.organizationId, input.applicationId);
    if (existingActive) {
      throw new ConflictError(`Application already has an active offer issued or in draft`);
    }

    const id = uuidv4();
    const now = new Date();
    const entity = new OfferEntity({
      id,
      organizationId: input.organizationId,
      applicationId: input.applicationId,
      positionId: app.positionId,
      proposedRoleId: input.proposedRoleId ?? null,
      employmentType: input.employmentType ?? 'full_time',
      baseSalary: input.baseSalary,
      currency: input.currency ?? 'USD',
      compensationFrequency: input.compensationFrequency ?? 'monthly',
      proposedStartDate: input.proposedStartDate,
      status: 'draft',
      expiresAt: input.expiresAt ?? null,
      termsConditions: input.termsConditions ?? null,
      financialObligationId: input.financialObligationId ?? null,
      createdAt: now,
      updatedAt: now,
    });

    entity.issue(input.expiresAt);
    app.markOffered();

    const result = await withTransaction(async (tx) => {
      await ApplicationRepository.update(app, tx);
      const saved = await OfferRepository.create(entity, tx);

      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.offer.issued',
        entityType: 'Offer',
        entityId: saved.id,
        afterState: { id: saved.id, applicationId: saved.applicationId, baseSalary: saved.baseSalary, status: saved.status },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.offer.issued',
        entityType: 'Offer',
        entityId: saved.id,
        payload: { id: saved.id, applicationId: saved.applicationId, baseSalary: saved.baseSalary },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async getOffer(organizationId: string, offerId: string): Promise<OfferEntity> {
    const offer = await OfferRepository.findById(organizationId, offerId);
    if (!offer) {
      throw new NotFoundError(`Offer '${offerId}' not found in organization`);
    }
    return offer;
  }

  public static async getActiveOfferByApplication(organizationId: string, applicationId: string): Promise<OfferEntity> {
    const offer = await OfferRepository.findActiveByApplicationId(organizationId, applicationId);
    if (!offer) {
      const list = await OfferRepository.list(organizationId, { applicationId });
      if (list.length === 0) {
        throw new NotFoundError(`No offer found for application '${applicationId}'`);
      }
      return list[0];
    }
    return offer;
  }

  public static async acceptOffer(input: RespondOfferInput): Promise<OfferEntity> {
    const offer = await OfferService.getOffer(input.organizationId, input.offerId);
    offer.accept(input.responseNotes);

    const result = await withTransaction(async (tx) => {
      const saved = await OfferRepository.update(offer, tx);

      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.offer.accepted',
        entityType: 'Offer',
        entityId: saved.id,
        afterState: { id: saved.id, status: saved.status },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.offer.accepted',
        entityType: 'Offer',
        entityId: saved.id,
        payload: { id: saved.id, applicationId: saved.applicationId },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async rejectOffer(input: RespondOfferInput): Promise<OfferEntity> {
    const offer = await OfferService.getOffer(input.organizationId, input.offerId);
    offer.reject(input.responseNotes);

    const result = await withTransaction(async (tx) => {
      const saved = await OfferRepository.update(offer, tx);

      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.offer.rejected',
        entityType: 'Offer',
        entityId: saved.id,
        afterState: { id: saved.id, status: saved.status },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.offer.rejected',
        entityType: 'Offer',
        entityId: saved.id,
        payload: { id: saved.id, applicationId: saved.applicationId },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async rescindOffer(input: RespondOfferInput): Promise<OfferEntity> {
    const offer = await OfferService.getOffer(input.organizationId, input.offerId);
    offer.rescind(input.responseNotes);

    const result = await withTransaction(async (tx) => {
      const saved = await OfferRepository.update(offer, tx);

      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.offer.rescinded',
        entityType: 'Offer',
        entityId: saved.id,
        afterState: { id: saved.id, status: saved.status },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.offer.rescinded',
        entityType: 'Offer',
        entityId: saved.id,
        payload: { id: saved.id, applicationId: saved.applicationId },
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
