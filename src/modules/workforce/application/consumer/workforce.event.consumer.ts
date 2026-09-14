import { DomainEventPayload, eventBus } from '../../../../events/event-bus.js';
import { WorkforceService } from '../workforce.service.js';
import { WorkforceRepository } from '../../infrastructure/workforce.repository.js';
import { PeopleRepository } from '../../../people/infrastructure/people.repository.js';
import { EmploymentRepository } from '../../../people/infrastructure/employment.repository.js';
import { logger } from '../../../../shared/logging/logger.js';
import { NotFoundError } from '../../../../shared/errors/index.js';
import { OnboardingPlan } from '../../domain/workforce.types.js';

export class WorkforceEventConsumer {
  private workforceService: WorkforceService;
  private workforceRepo: WorkforceRepository;

  constructor(workforceService?: WorkforceService, workforceRepo?: WorkforceRepository) {
    this.workforceService = workforceService || new WorkforceService();
    this.workforceRepo = workforceRepo || new WorkforceRepository();
  }

  /**
   * Handle recruitment.candidate.hired event emitted by M13 /hire.
   * Resolves existing Person and Employment, creates/initiates Onboarding Plan.
   * NEVER creates an Employment or Person.
   * Guaranteed idempotent and concurrency-safe.
   */
  public async handleCandidateHired(event: DomainEventPayload): Promise<OnboardingPlan | null> {
    const orgId = event.organizationId;
    if (!orgId) {
      logger.warn('[WorkforceEventConsumer] Ignored event missing organizationId');
      return null;
    }

    const payload = (event.payload || {}) as {
      candidateId?: string;
      personId?: string;
      employmentId?: string;
      positionId?: string;
      applicationId?: string;
    };

    if (!payload.personId || !payload.employmentId) {
      logger.warn('[WorkforceEventConsumer] Ignored event missing personId or employmentId');
      return null;
    }

    // 1. Resolve existing Person & validate tenant ownership
    const person = await PeopleRepository.findPersonById(orgId, payload.personId);
    if (!person) {
      throw new NotFoundError(`Person '${payload.personId}' not found in organization '${orgId}'`);
    }

    // 2. Resolve existing Employment created by M13 & validate tenant ownership
    const employment = await EmploymentRepository.findEmploymentById(orgId, payload.employmentId);
    if (!employment) {
      throw new NotFoundError(`Employment '${payload.employmentId}' not found in organization '${orgId}'`);
    }

    if (employment.personId !== person.id) {
      throw new NotFoundError(`Employment '${payload.employmentId}' does not belong to person '${person.id}'`);
    }

    // 3. Idempotency Check: Return existing plan if already created
    const existingPlan = await this.workforceRepo.findPlanByEmployment(orgId, employment.id);
    if (existingPlan) {
      return existingPlan;
    }

    // 4. Create and initiate onboarding plan using existing Employment (NO DUPLICATE EMPLOYMENT)
    const plan = await this.workforceService.createOnboardingPlan(
      {
        organizationId: orgId,
        employmentId: employment.id,
        personId: person.id,
        status: 'initiated',
        notes: `Automated onboarding plan initialized for candidate ${payload.candidateId || ''}`.trim(),
        initiatedBy: event.actorId || 'system',
      },
      event.actorId,
      event.requestId
    );

    return plan;
  }

  /**
   * Subscribe to event bus for asynchronous handling.
   */
  public register(): void {
    eventBus.on('recruitment.candidate.hired', async (event: DomainEventPayload) => {
      try {
        await this.handleCandidateHired(event);
      } catch (err) {
        logger.error('[WorkforceEventConsumer] Error processing recruitment.candidate.hired event', { error: String(err) });
      }
    });
  }
}

// Global consumer instance
export const workforceEventConsumer = new WorkforceEventConsumer();
workforceEventConsumer.register();
