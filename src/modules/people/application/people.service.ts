import { PeopleRepository } from '../infrastructure/people.repository.js';
import { PersonValidator, PersonStatus } from '../domain/person.entity.js';
import { RoleSkillValidator } from '../domain/role-skill.entity.js';
import { eventBus } from '../../../events/event-bus.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/index.js';

export class PeopleService {
  // --- PEOPLE ---
  public static async createPerson(
    organizationId: string,
    data: {
      userId?: string | null;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
      status?: PersonStatus;
    },
    actorId?: string,
    requestId?: string
  ) {
    PersonValidator.validateEmail(data.email);
    PersonValidator.validateNames(data.firstName, data.lastName);

    try {
      const person = await PeopleRepository.createPerson({
        organizationId,
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        status: data.status,
      });

      eventBus.publish({
        eventName: 'PersonCreated',
        organizationId,
        actorId,
        entityType: 'Person',
        entityId: person.id,
        payload: { firstName: person.firstName, lastName: person.lastName, email: person.email },
        requestId,
      });

      return person;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictError(`Person with email '${data.email}' already exists in this organization`);
      }
      throw err;
    }
  }

  public static async getPerson(organizationId: string, id: string) {
    const person = await PeopleRepository.findPersonById(organizationId, id);
    if (!person) {
      throw new NotFoundError('Person not found');
    }
    return person;
  }

  public static async listPeople(organizationId: string) {
    return PeopleRepository.listPeople(organizationId);
  }

  public static async updatePerson(
    organizationId: string,
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      status?: PersonStatus;
      userId?: string | null;
    },
    actorId?: string,
    requestId?: string
  ) {
    await this.getPerson(organizationId, id);
    if (data.firstName || data.lastName) {
      PersonValidator.validateNames(data.firstName || 'A', data.lastName || 'B');
    }

    const updated = await PeopleRepository.updatePerson(organizationId, id, data);
    if (!updated) {
      throw new NotFoundError('Person not found');
    }

    eventBus.publish({
      eventName: 'PersonUpdated',
      organizationId,
      actorId,
      entityType: 'Person',
      entityId: id,
      payload: data,
      requestId,
    });

    return updated;
  }

  public static async archivePerson(organizationId: string, id: string, actorId?: string, requestId?: string) {
    const updated = await this.updatePerson(organizationId, id, { status: 'archived' }, actorId, requestId);
    eventBus.publish({
      eventName: 'PersonArchived',
      organizationId,
      actorId,
      entityType: 'Person',
      entityId: id,
      requestId,
    });
    return updated;
  }

  // --- ROLES ---
  public static async createRole(
    organizationId: string,
    data: { name: string; code: string; description?: string | null; isSystem?: boolean; status?: 'active' | 'inactive' },
    actorId?: string,
    requestId?: string
  ) {
    RoleSkillValidator.validateCode(data.code);
    try {
      const role = await PeopleRepository.createRole({
        organizationId,
        name: data.name,
        code: data.code,
        description: data.description,
        isSystem: data.isSystem,
        status: data.status,
      });

      eventBus.publish({
        eventName: 'RoleCreated',
        organizationId,
        actorId,
        entityType: 'Role',
        entityId: role.id,
        payload: { name: role.name, code: role.code },
        requestId,
      });

      return role;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictError(`Role with code '${data.code}' already exists in this organization`);
      }
      throw err;
    }
  }

  public static async listRoles(organizationId: string) {
    return PeopleRepository.listRoles(organizationId);
  }

  public static async getRole(organizationId: string, id: string) {
    const role = await PeopleRepository.findRoleById(organizationId, id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    return role;
  }

  public static async updateRole(
    organizationId: string,
    id: string,
    data: { name?: string; description?: string | null; status?: 'active' | 'inactive' },
    actorId?: string,
    requestId?: string
  ) {
    await this.getRole(organizationId, id);
    const updated = await PeopleRepository.updateRole(organizationId, id, data);
    if (!updated) {
      throw new NotFoundError('Role not found');
    }

    eventBus.publish({
      eventName: 'RoleUpdated',
      organizationId,
      actorId,
      entityType: 'Role',
      entityId: id,
      payload: data,
      requestId,
    });

    return updated;
  }

  // --- PERSON ROLES ---
  public static async assignRoleToPerson(
    organizationId: string,
    personId: string,
    data: {
      roleId: string;
      businessUnitId?: string | null;
      departmentId?: string | null;
      teamId?: string | null;
      startDate?: Date;
    },
    actorId?: string,
    requestId?: string
  ) {
    await this.getPerson(organizationId, personId);
    await this.getRole(organizationId, data.roleId);

    const personRole = await PeopleRepository.assignPersonRole({
      organizationId,
      personId,
      roleId: data.roleId,
      businessUnitId: data.businessUnitId,
      departmentId: data.departmentId,
      teamId: data.teamId,
      startDate: data.startDate,
    });

    eventBus.publish({
      eventName: 'PersonRoleAssigned',
      organizationId,
      actorId,
      entityType: 'PersonRole',
      entityId: personRole.id,
      payload: { personId, roleId: data.roleId },
      requestId,
    });

    return personRole;
  }

  public static async listRolesForPerson(organizationId: string, personId: string) {
    await this.getPerson(organizationId, personId);
    return PeopleRepository.listPersonRoles(organizationId, personId);
  }

  public static async endPersonRole(
    organizationId: string,
    personRoleId: string,
    actorId?: string,
    requestId?: string
  ) {
    const ended = await PeopleRepository.endPersonRole(organizationId, personRoleId);
    if (!ended) {
      throw new NotFoundError('Person role assignment not found');
    }

    eventBus.publish({
      eventName: 'PersonRoleEnded',
      organizationId,
      actorId,
      entityType: 'PersonRole',
      entityId: personRoleId,
      requestId,
    });

    return ended;
  }
}
