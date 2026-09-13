import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../../../database/index.js';
import { ApplicationRepository } from '../infrastructure/application.repository.js';
import { CandidateRepository } from '../infrastructure/candidate.repository.js';
import { PositionRepository } from '../infrastructure/position.repository.js';
import { OfferRepository } from '../infrastructure/offer.repository.js';
import { IdentityConflictError, PositionClosedError, PositionFullError } from '../domain/recruitment.errors.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../../../shared/errors/index.js';

export interface HireCandidateInput {
  organizationId: string;
  applicationId: string;
  offerId?: string | null;
  actorId?: string;
  requestId?: string;
}

export interface HireCandidateResult {
  applicationId: string;
  candidateId: string;
  personId: string;
  employmentId: string;
  status: string;
  hiredAt: Date | null;
  withdrawnConcurrentApplications: string[];
  positionStatus: string;
  positionHiredCount: number;
  positionOpeningsCount: number;
}

export class HiringService {
  public static async hireCandidate(input: HireCandidateInput): Promise<HireCandidateResult> {
    const initialApp = await ApplicationRepository.findById(input.organizationId, input.applicationId);
    if (!initialApp) {
      throw new NotFoundError(`Application '${input.applicationId}' not found in organization`);
    }

    if (initialApp.status !== 'offered') {
      throw new ValidationError(`Application must be in status 'offered' to be hired, currently '${initialApp.status}'`);
    }

    const txResult = await withTransaction(async (tx) => {
      // 1. Pessimistic row lock on Position
      const position = await PositionRepository.findByIdForUpdate(input.organizationId, initialApp.positionId, tx);
      if (!position) {
        throw new NotFoundError(`Position '${initialApp.positionId}' not found in organization`);
      }
      if (position.status === 'closed') {
        throw new PositionClosedError('Position is closed and cannot accept new hires');
      }
      if (position.hiredCount >= position.openingsCount) {
        throw new PositionFullError('Position has no remaining available openings');
      }

      // 2. Fetch & validate Offer
      let offer = null;
      if (input.offerId) {
        offer = await OfferRepository.findById(input.organizationId, input.offerId, tx);
      } else {
        offer = await OfferRepository.findActiveByApplicationId(input.organizationId, input.applicationId, tx);
        if (!offer) {
          const offers = await OfferRepository.list(input.organizationId, { applicationId: input.applicationId });
          offer = offers.find((o) => o.status === 'accepted') || offers[0] || null;
        }
      }

      if (!offer) {
        throw new NotFoundError(`No offer found for application '${input.applicationId}'`);
      }
      if (offer.status !== 'accepted') {
        throw new ValidationError(`Offer must be in status 'accepted' prior to hiring candidate, currently '${offer.status}'`);
      }

      // 3. Fetch & validate Candidate
      const candidate = await CandidateRepository.findById(input.organizationId, initialApp.candidateId, tx);
      if (!candidate) {
        throw new NotFoundError(`Candidate '${initialApp.candidateId}' not found in organization`);
      }
      if (candidate.status === 'hired') {
        throw new ConflictError(`Candidate '${candidate.id}' is already marked as hired`);
      }

      // 4. Identity Safety & Person / Employment creation
      let personId = candidate.internalPersonId;

      if (!personId) {
        // Check case-insensitive email collision in people table
        const collisionRes = await tx.query(
          `SELECT id FROM people WHERE organization_id = $1 AND LOWER(email) = LOWER($2);`,
          [input.organizationId, candidate.email]
        );

        if (collisionRes.rows.length > 0) {
          throw new IdentityConflictError(
            `Candidate email '${candidate.email}' matches an existing Person in the organization. Explicit administrative resolution required.`,
            { email: candidate.email, existingPersonId: (collisionRes.rows[0] as any).id }
          );
        }

        // Create new M2 Person
        personId = uuidv4();
        await tx.query(
          `INSERT INTO people (id, organization_id, first_name, last_name, email, phone, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active');`,
          [
            personId,
            input.organizationId,
            candidate.firstName,
            candidate.lastName,
            candidate.email,
            candidate.phone,
          ]
        );
      }

      // Create M2 Employment contract
      const employmentId = uuidv4();
      const validEmpTypes = ['full_time', 'part_time', 'contract', 'internship', 'freelance'];
      const empType = validEmpTypes.includes(offer.employmentType) ? offer.employmentType : 'contract';

      await tx.query(
        `INSERT INTO employments (
          id, organization_id, person_id, employment_type, status, job_title,
          department_id, business_unit_id, manager_id, start_date
        ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9);`,
        [
          employmentId,
          input.organizationId,
          personId,
          empType,
          position.title,
          position.departmentId,
          position.businessUnitId,
          position.hiringManagerId,
          offer.proposedStartDate,
        ]
      );

      // Mark candidate hired
      candidate.markHired(personId);
      await CandidateRepository.update(candidate, tx);

      // Mark application hired
      initialApp.markHired();
      const savedApp = await ApplicationRepository.update(initialApp, tx);

      // Record hire on position
      position.recordHire();
      const savedPosition = await PositionRepository.update(position, tx);

      // Auto-withdraw other active applications for candidate
      const otherActive = await ApplicationRepository.findOtherActiveApplicationsForCandidate(
        input.organizationId,
        candidate.id,
        initialApp.id,
        tx
      );

      const withdrawnIds: string[] = [];
      for (const otherApp of otherActive) {
        otherApp.withdraw('candidate_hired_elsewhere');
        await ApplicationRepository.update(otherApp, tx);
        withdrawnIds.push(otherApp.id);

        await OutboxService.stageOutboxEvent({
          organizationId: input.organizationId,
          eventName: 'recruitment.application.withdrawn',
          entityType: 'Application',
          entityId: otherApp.id,
          payload: { id: otherApp.id, reason: 'candidate_hired_elsewhere' },
          actorId: input.actorId,
          requestId: input.requestId,
          dbClient: tx,
        });
      }

      // Audit log & outbox event
      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.candidate.hired',
        entityType: 'Candidate',
        entityId: candidate.id,
        afterState: {
          candidateId: candidate.id,
          personId,
          employmentId,
          positionId: savedPosition.id,
          applicationId: savedApp.id,
        },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.candidate.hired',
        entityType: 'Candidate',
        entityId: candidate.id,
        payload: {
          candidateId: candidate.id,
          personId,
          employmentId,
          positionId: savedPosition.id,
          applicationId: savedApp.id,
        },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return {
        result: {
          applicationId: savedApp.id,
          candidateId: candidate.id,
          personId,
          employmentId,
          status: savedApp.status,
          hiredAt: savedApp.hiredAt,
          withdrawnConcurrentApplications: withdrawnIds,
          positionStatus: savedPosition.status,
          positionHiredCount: savedPosition.hiredCount,
          positionOpeningsCount: savedPosition.openingsCount,
        },
        outbox,
      };
    });

    await OutboxService.dispatchImmediate(txResult.outbox);
    return txResult.result;
  }
}
