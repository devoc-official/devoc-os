import { EmploymentRepository } from '../infrastructure/employment.repository.js';
import { PeopleRepository } from '../infrastructure/people.repository.js';
import { EmploymentStateMachine, EmploymentStatus, EmploymentType } from '../domain/employment.entity.js';
import { withTransaction } from '../../../database/index.js';
import { eventBus } from '../../../events/event-bus.js';
import { NotFoundError } from '../../../shared/errors/index.js';

export class EmploymentService {
  public static async createEmployment(
    organizationId: string,
    data: {
      personId: string;
      employmentType: EmploymentType;
      status?: EmploymentStatus;
      jobTitle: string;
      departmentId?: string | null;
      businessUnitId?: string | null;
      branchId?: string | null;
      managerId?: string | null;
      startDate?: Date;
    },
    actorId?: string,
    requestId?: string
  ) {
    const person = await PeopleRepository.findPersonById(organizationId, data.personId);
    if (!person) {
      throw new NotFoundError('Person not found');
    }

    if (data.managerId) {
      const manager = await PeopleRepository.findPersonById(organizationId, data.managerId);
      if (!manager) {
        throw new NotFoundError('Reporting manager person not found');
      }
    }

    EmploymentStateMachine.validateEmploymentType(data.employmentType);

    return await withTransaction(async (txClient) => {
      const employment = await EmploymentRepository.createEmployment(
        {
          organizationId,
          personId: data.personId,
          employmentType: data.employmentType,
          status: data.status,
          jobTitle: data.jobTitle,
          departmentId: data.departmentId,
          businessUnitId: data.businessUnitId,
          branchId: data.branchId,
          managerId: data.managerId,
          startDate: data.startDate,
        },
        txClient
      );

      // Record initial history entry
      await EmploymentRepository.recordHistory(
        {
          organizationId,
          employmentId: employment.id,
          personId: data.personId,
          previousStatus: null,
          newStatus: employment.status,
          changeReason: 'Initial Employment Creation',
          effectiveDate: employment.startDate,
        },
        txClient
      );

      eventBus.publish({
        eventName: 'EmploymentCreated',
        organizationId,
        actorId,
        entityType: 'Employment',
        entityId: employment.id,
        payload: { personId: data.personId, status: employment.status, jobTitle: employment.jobTitle },
        requestId,
      });

      return employment;
    });
  }

  public static async getEmployment(organizationId: string, id: string) {
    const employment = await EmploymentRepository.findEmploymentById(organizationId, id);
    if (!employment) {
      throw new NotFoundError('Employment record not found');
    }
    return employment;
  }

  public static async listEmployments(organizationId: string) {
    return EmploymentRepository.listEmployments(organizationId);
  }

  public static async updateEmployment(
    organizationId: string,
    id: string,
    data: {
      jobTitle?: string;
      departmentId?: string | null;
      businessUnitId?: string | null;
      branchId?: string | null;
      managerId?: string | null;
      endDate?: Date | null;
    },
    actorId?: string,
    requestId?: string
  ) {
    await this.getEmployment(organizationId, id);
    if (data.managerId) {
      const manager = await PeopleRepository.findPersonById(organizationId, data.managerId);
      if (!manager) {
        throw new NotFoundError('Reporting manager person not found');
      }
    }

    const updated = await EmploymentRepository.updateEmployment(organizationId, id, data);
    if (!updated) {
      throw new NotFoundError('Employment record not found');
    }

    eventBus.publish({
      eventName: 'EmploymentUpdated',
      organizationId,
      actorId,
      entityType: 'Employment',
      entityId: id,
      payload: data,
      requestId,
    });

    return updated;
  }

  public static async updateEmploymentStatus(
    organizationId: string,
    id: string,
    data: { nextStatus: EmploymentStatus; changeReason?: string; effectiveDate?: Date },
    actorId?: string,
    requestId?: string
  ) {
    const existing = await this.getEmployment(organizationId, id);
    EmploymentStateMachine.validateStatusTransition(existing.status, data.nextStatus);

    return await withTransaction(async (txClient) => {
      const updated = await EmploymentRepository.updateEmployment(
        organizationId,
        id,
        {
          status: data.nextStatus,
          endDate: ['terminated', 'resigned'].includes(data.nextStatus) ? new Date() : undefined,
        },
        txClient
      );

      await EmploymentRepository.recordHistory(
        {
          organizationId,
          employmentId: id,
          personId: existing.personId,
          previousStatus: existing.status,
          newStatus: data.nextStatus,
          changeReason: data.changeReason || null,
          effectiveDate: data.effectiveDate || new Date(),
        },
        txClient
      );

      eventBus.publish({
        eventName: 'EmploymentStatusChanged',
        organizationId,
        actorId,
        entityType: 'Employment',
        entityId: id,
        payload: { previousStatus: existing.status, newStatus: data.nextStatus, reason: data.changeReason },
        requestId,
      });

      return updated;
    });
  }

  public static async getEmploymentHistory(organizationId: string, employmentId: string) {
    await this.getEmployment(organizationId, employmentId);
    return EmploymentRepository.listHistory(organizationId, employmentId);
  }

  public static async getDirectReports(organizationId: string, managerPersonId: string) {
    const manager = await PeopleRepository.findPersonById(organizationId, managerPersonId);
    if (!manager) {
      throw new NotFoundError('Manager person not found');
    }
    return EmploymentRepository.getDirectReports(organizationId, managerPersonId);
  }
}
