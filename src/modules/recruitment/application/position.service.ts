import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../../../database/index.js';
import { PositionEntity, PositionStatus, EmploymentType } from '../domain/position.entity.js';
import { PositionRepository } from '../infrastructure/position.repository.js';
import { RecruitmentTenantValidator } from '../infrastructure/recruitment-tenant.validator.js';
import { AuditService } from '../../../audit/audit.service.js';
import { OutboxService } from '../../../events/outbox.service.js';
import { NotFoundError } from '../../../shared/errors/index.js';

export interface CreatePositionInput {
  organizationId: string;
  title: string;
  code: string;
  businessUnitId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  targetRoleId?: string | null;
  employmentType?: EmploymentType;
  openingsCount?: number;
  hiringManagerId?: string | null;
  recruiterId?: string | null;
  description?: string | null;
  requirements?: string | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string;
  targetStartDate?: Date | string | null;
  actorId?: string;
  requestId?: string;
}

export interface UpdatePositionInput {
  title?: string;
  code?: string;
  businessUnitId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  targetRoleId?: string | null;
  employmentType?: EmploymentType;
  openingsCount?: number;
  hiringManagerId?: string | null;
  recruiterId?: string | null;
  description?: string | null;
  requirements?: string | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string;
  targetStartDate?: Date | string | null;
  actorId?: string;
  requestId?: string;
}

export class PositionService {
  public static async createPosition(input: CreatePositionInput): Promise<PositionEntity> {
    await RecruitmentTenantValidator.validateBusinessUnit(input.organizationId, input.businessUnitId);
    await RecruitmentTenantValidator.validateDepartment(input.organizationId, input.departmentId);
    await RecruitmentTenantValidator.validateTeam(input.organizationId, input.teamId);
    await RecruitmentTenantValidator.validateRole(input.organizationId, input.targetRoleId);
    await RecruitmentTenantValidator.validatePerson(input.organizationId, input.hiringManagerId, 'Hiring Manager');
    await RecruitmentTenantValidator.validatePerson(input.organizationId, input.recruiterId, 'Recruiter');

    const id = uuidv4();
    const now = new Date();
    const entity = new PositionEntity({
      id,
      organizationId: input.organizationId,
      title: input.title,
      code: input.code,
      businessUnitId: input.businessUnitId ?? null,
      departmentId: input.departmentId ?? null,
      teamId: input.teamId ?? null,
      targetRoleId: input.targetRoleId ?? null,
      employmentType: input.employmentType ?? 'full_time',
      openingsCount: input.openingsCount ?? 1,
      hiredCount: 0,
      hiringManagerId: input.hiringManagerId ?? null,
      recruiterId: input.recruiterId ?? null,
      description: input.description ?? null,
      requirements: input.requirements ?? null,
      minSalary: input.minSalary ?? null,
      maxSalary: input.maxSalary ?? null,
      currency: input.currency ?? 'USD',
      targetStartDate: input.targetStartDate ?? null,
      status: 'draft',
      openedAt: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await withTransaction(async (tx) => {
      const saved = await PositionRepository.create(entity, tx);

      await AuditService.recordLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: 'recruitment.position.created',
        entityType: 'Position',
        entityId: saved.id,
        afterState: { id: saved.id, code: saved.code, title: saved.title, status: saved.status },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      const outbox = await OutboxService.stageOutboxEvent({
        organizationId: input.organizationId,
        eventName: 'recruitment.position.created',
        entityType: 'Position',
        entityId: saved.id,
        payload: { id: saved.id, code: saved.code, title: saved.title },
        actorId: input.actorId,
        requestId: input.requestId,
        dbClient: tx,
      });

      return { saved, outbox };
    });

    await OutboxService.dispatchImmediate(result.outbox);
    return result.saved;
  }

  public static async getPosition(organizationId: string, id: string): Promise<PositionEntity> {
    const position = await PositionRepository.findById(organizationId, id);
    if (!position) {
      throw new NotFoundError(`Position '${id}' not found in organization`);
    }
    return position;
  }

  public static async listPositions(
    organizationId: string,
    filters: {
      status?: PositionStatus;
      businessUnitId?: string;
      departmentId?: string;
      teamId?: string;
      search?: string;
    } = {}
  ): Promise<PositionEntity[]> {
    return PositionRepository.list(organizationId, filters);
  }

  public static async updatePosition(
    organizationId: string,
    id: string,
    input: UpdatePositionInput
  ): Promise<PositionEntity> {
    const position = await PositionService.getPosition(organizationId, id);

    if (input.businessUnitId !== undefined) {
      await RecruitmentTenantValidator.validateBusinessUnit(organizationId, input.businessUnitId);
      position.businessUnitId = input.businessUnitId;
    }
    if (input.departmentId !== undefined) {
      await RecruitmentTenantValidator.validateDepartment(organizationId, input.departmentId);
      position.departmentId = input.departmentId;
    }
    if (input.teamId !== undefined) {
      await RecruitmentTenantValidator.validateTeam(organizationId, input.teamId);
      position.teamId = input.teamId;
    }
    if (input.targetRoleId !== undefined) {
      await RecruitmentTenantValidator.validateRole(organizationId, input.targetRoleId);
      position.targetRoleId = input.targetRoleId;
    }
    if (input.hiringManagerId !== undefined) {
      await RecruitmentTenantValidator.validatePerson(organizationId, input.hiringManagerId, 'Hiring Manager');
      position.hiringManagerId = input.hiringManagerId;
    }
    if (input.recruiterId !== undefined) {
      await RecruitmentTenantValidator.validatePerson(organizationId, input.recruiterId, 'Recruiter');
      position.recruiterId = input.recruiterId;
    }

    if (input.title !== undefined) position.title = input.title.trim();
    if (input.code !== undefined) position.code = input.code.trim();
    if (input.employmentType !== undefined) position.employmentType = input.employmentType;
    if (input.openingsCount !== undefined) position.openingsCount = input.openingsCount;
    if (input.description !== undefined) position.description = input.description;
    if (input.requirements !== undefined) position.requirements = input.requirements;
    if (input.minSalary !== undefined) position.minSalary = input.minSalary;
    if (input.maxSalary !== undefined) position.maxSalary = input.maxSalary;
    if (input.currency !== undefined) position.currency = input.currency;
    if (input.targetStartDate !== undefined) {
      position.targetStartDate = input.targetStartDate ? new Date(input.targetStartDate) : null;
    }
    position.updatedAt = new Date();

    const result = await withTransaction(async (tx) => {
      const saved = await PositionRepository.update(position, tx);

      await AuditService.recordLog({
        organizationId,
        actorId: input.actorId,
        action: 'recruitment.position.updated',
        entityType: 'Position',
        entityId: saved.id,
        afterState: { id: saved.id, title: saved.title },
        requestId: input.requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      return saved;
    });

    return result;
  }

  public static async transitionStatus(
    organizationId: string,
    id: string,
    targetStatus: 'open' | 'pause' | 'close' | 'archive',
    actorId?: string,
    requestId?: string
  ): Promise<PositionEntity> {
    const position = await PositionService.getPosition(organizationId, id);

    let eventName = '';
    if (targetStatus === 'open') {
      position.open();
      eventName = 'recruitment.position.opened';
    } else if (targetStatus === 'pause') {
      position.pause();
      eventName = 'recruitment.position.paused';
    } else if (targetStatus === 'close') {
      position.close();
      eventName = 'recruitment.position.closed';
    } else if (targetStatus === 'archive') {
      position.archive();
      eventName = 'recruitment.position.archived';
    }

    const result = await withTransaction(async (tx) => {
      const saved = await PositionRepository.update(position, tx);

      await AuditService.recordLog({
        organizationId,
        actorId,
        action: eventName,
        entityType: 'Position',
        entityId: saved.id,
        afterState: { id: saved.id, status: saved.status },
        requestId,
        sourceModule: 'recruitment',
        dbClient: tx,
      });

      let outboxRecord = null;
      if (eventName && eventName !== 'recruitment.position.archived') {
        outboxRecord = await OutboxService.stageOutboxEvent({
          organizationId,
          eventName,
          entityType: 'Position',
          entityId: saved.id,
          payload: { id: saved.id, status: saved.status },
          actorId,
          requestId,
          dbClient: tx,
        });
      }

      return { saved, outboxRecord };
    });

    if (result.outboxRecord) {
      await OutboxService.dispatchImmediate(result.outboxRecord);
    }
    return result.saved;
  }
}
