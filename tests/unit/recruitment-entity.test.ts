import { describe, it, expect } from 'vitest';
import { PositionEntity } from '../../src/modules/recruitment/domain/position.entity.js';
import { CandidateEntity } from '../../src/modules/recruitment/domain/candidate.entity.js';
import { ApplicationEntity } from '../../src/modules/recruitment/domain/application.entity.js';
import { TrialEntity } from '../../src/modules/recruitment/domain/trial.entity.js';
import { OfferEntity } from '../../src/modules/recruitment/domain/offer.entity.js';
import { PositionClosedError } from '../../src/modules/recruitment/domain/recruitment.errors.js';
import { ValidationError, InvalidStateTransitionError } from '../../src/shared/errors/index.js';
import { v4 as uuidv4 } from 'uuid';

describe('Milestone 13 — Recruitment Engine Domain Entity Unit Tests', () => {
  const orgId = uuidv4();
  const now = new Date();

  describe('PositionEntity', () => {
    it('should create a valid Position entity', () => {
      const pos = new PositionEntity({
        id: uuidv4(),
        organizationId: orgId,
        title: 'Backend Engineer',
        code: 'REQ-ENG-01',
        employmentType: 'full_time',
        openingsCount: 2,
        hiredCount: 0,
        currency: 'USD',
        minSalary: 80000,
        maxSalary: 120000,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });

      expect(pos.title).toBe('Backend Engineer');
      expect(pos.code).toBe('REQ-ENG-01');
      expect(pos.status).toBe('draft');
      expect(pos.openingsCount).toBe(2);
      expect(pos.hiredCount).toBe(0);
    });

    it('should throw ValidationError if minSalary exceeds maxSalary', () => {
      expect(() => {
        new PositionEntity({
          id: uuidv4(),
          organizationId: orgId,
          title: 'Backend Engineer',
          code: 'REQ-ENG-02',
          employmentType: 'full_time',
          openingsCount: 1,
          hiredCount: 0,
          currency: 'USD',
          minSalary: 150000,
          maxSalary: 100000,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        });
      }).toThrow(ValidationError);
    });

    it('should transition status draft -> open -> paused -> closed', () => {
      const pos = new PositionEntity({
        id: uuidv4(),
        organizationId: orgId,
        title: 'Tech Lead',
        code: 'REQ-LEAD-01',
        employmentType: 'full_time',
        openingsCount: 1,
        hiredCount: 0,
        currency: 'USD',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });

      pos.open();
      expect(pos.status).toBe('open');
      expect(pos.openedAt).toBeDefined();

      pos.pause();
      expect(pos.status).toBe('paused');

      pos.open();
      expect(pos.status).toBe('open');

      pos.close();
      expect(pos.status).toBe('closed');
      expect(pos.closedAt).toBeDefined();
    });

    it('should prohibit reopening a closed position', () => {
      const pos = new PositionEntity({
        id: uuidv4(),
        organizationId: orgId,
        title: 'Closed Position',
        code: 'REQ-CLOSED-01',
        employmentType: 'full_time',
        openingsCount: 1,
        hiredCount: 1,
        currency: 'USD',
        status: 'closed',
        createdAt: now,
        updatedAt: now,
      });

      expect(() => pos.open()).toThrow(PositionClosedError);
    });

    it('should allow recordHire only when status is open', () => {
      const openPos = new PositionEntity({
        id: uuidv4(),
        organizationId: orgId,
        title: 'Open Position',
        code: 'REQ-OPEN-01',
        employmentType: 'full_time',
        openingsCount: 2,
        hiredCount: 0,
        currency: 'USD',
        status: 'open',
        createdAt: now,
        updatedAt: now,
      });
      openPos.recordHire();
      expect(openPos.hiredCount).toBe(1);

      const pausedPos = new PositionEntity({
        id: uuidv4(),
        organizationId: orgId,
        title: 'Paused Position',
        code: 'REQ-PAUSED-01',
        employmentType: 'full_time',
        openingsCount: 2,
        hiredCount: 0,
        currency: 'USD',
        status: 'paused',
        createdAt: now,
        updatedAt: now,
      });
      expect(() => pausedPos.recordHire()).toThrow(InvalidStateTransitionError);

      const draftPos = new PositionEntity({
        id: uuidv4(),
        organizationId: orgId,
        title: 'Draft Position',
        code: 'REQ-DRAFT-01',
        employmentType: 'full_time',
        openingsCount: 2,
        hiredCount: 0,
        currency: 'USD',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });
      expect(() => draftPos.recordHire()).toThrow(InvalidStateTransitionError);

      const closedPos = new PositionEntity({
        id: uuidv4(),
        organizationId: orgId,
        title: 'Closed Position',
        code: 'REQ-CLOSED-02',
        employmentType: 'full_time',
        openingsCount: 1,
        hiredCount: 1,
        currency: 'USD',
        status: 'closed',
        createdAt: now,
        updatedAt: now,
      });
      expect(() => closedPos.recordHire()).toThrow(PositionClosedError);

      const archivedPos = new PositionEntity({
        id: uuidv4(),
        organizationId: orgId,
        title: 'Archived Position',
        code: 'REQ-ARCHIVED-01',
        employmentType: 'full_time',
        openingsCount: 2,
        hiredCount: 0,
        currency: 'USD',
        status: 'archived',
        createdAt: now,
        updatedAt: now,
      });
      expect(() => archivedPos.recordHire()).toThrow(InvalidStateTransitionError);
    });
  });

  describe('CandidateEntity', () => {
    it('should normalize email to lowercase and validate formatting', () => {
      const candidate = new CandidateEntity({
        id: uuidv4(),
        organizationId: orgId,
        firstName: ' Alice ',
        lastName: ' Smith ',
        email: ' ALICE.SMITH@EXAMPLE.COM ',
        source: 'referral',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      expect(candidate.firstName).toBe('Alice');
      expect(candidate.lastName).toBe('Smith');
      expect(candidate.email).toBe('alice.smith@example.com');
      expect(candidate.status).toBe('active');
    });

    it('should throw ValidationError on invalid email format', () => {
      expect(() => {
        new CandidateEntity({
          id: uuidv4(),
          organizationId: orgId,
          firstName: 'Bad',
          lastName: 'Email',
          email: 'invalid-email-format',
          source: 'other',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
      }).toThrow(ValidationError);
    });
  });

  describe('TrialEntity Identity Boundaries', () => {
    it('should throw ValidationError if external candidate trial contains M3 Assignment or M8 Evaluation', () => {
      expect(() => {
        new TrialEntity({
          id: uuidv4(),
          organizationId: orgId,
          applicationId: uuidv4(),
          startDate: '2026-09-20',
          endDate: '2026-10-04',
          status: 'scheduled',
          assignmentId: uuidv4(),
          createdAt: now,
          updatedAt: now,
          isExternalCandidate: true,
        });
      }).toThrow(ValidationError);

      expect(() => {
        new TrialEntity({
          id: uuidv4(),
          organizationId: orgId,
          applicationId: uuidv4(),
          startDate: '2026-09-20',
          endDate: '2026-10-04',
          status: 'scheduled',
          evaluationId: uuidv4(),
          createdAt: now,
          updatedAt: now,
          isExternalCandidate: true,
        });
      }).toThrow(ValidationError);
    });
  });

  describe('OfferEntity', () => {
    it('should enforce response state machine transitions', () => {
      const offer = new OfferEntity({
        id: uuidv4(),
        organizationId: orgId,
        applicationId: uuidv4(),
        positionId: uuidv4(),
        employmentType: 'full_time',
        baseSalary: 100000,
        currency: 'USD',
        compensationFrequency: 'annual',
        proposedStartDate: '2026-10-15',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });

      offer.issue();
      expect(offer.status).toBe('issued');

      offer.accept('Signed offer letter');
      expect(offer.status).toBe('accepted');
      expect(offer.isTerminal()).toBe(true);

      expect(() => offer.reject('Too late')).toThrow();
    });
  });
});
