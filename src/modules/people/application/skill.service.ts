import { SkillRepository } from '../infrastructure/skill.repository.js';
import { PeopleRepository } from '../infrastructure/people.repository.js';
import { RoleSkillValidator, ProficiencyLevel } from '../domain/role-skill.entity.js';
import { eventBus } from '../../../events/event-bus.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/index.js';

export class SkillService {
  public static async createSkill(
    organizationId: string,
    data: { name: string; code: string; category?: string | null; status?: 'active' | 'inactive' },
    actorId?: string,
    requestId?: string
  ) {
    RoleSkillValidator.validateCode(data.code);
    try {
      const skill = await SkillRepository.createSkill({
        organizationId,
        name: data.name,
        code: data.code,
        category: data.category,
        status: data.status,
      });

      eventBus.publish({
        eventName: 'SkillCreated',
        organizationId,
        actorId,
        entityType: 'Skill',
        entityId: skill.id,
        payload: { name: skill.name, code: skill.code },
        requestId,
      });

      return skill;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictError(`Skill with code '${data.code}' already exists in this organization`);
      }
      throw err;
    }
  }

  public static async listSkills(organizationId: string) {
    return SkillRepository.listSkills(organizationId);
  }

  public static async getSkill(organizationId: string, id: string) {
    const skill = await SkillRepository.findSkillById(organizationId, id);
    if (!skill) {
      throw new NotFoundError('Skill not found');
    }
    return skill;
  }

  public static async assignPersonSkill(
    organizationId: string,
    personId: string,
    data: { skillId: string; proficiencyLevel: ProficiencyLevel },
    actorId?: string,
    requestId?: string
  ) {
    const person = await PeopleRepository.findPersonById(organizationId, personId);
    if (!person) {
      throw new NotFoundError('Person not found');
    }
    await this.getSkill(organizationId, data.skillId);
    RoleSkillValidator.validateProficiencyLevel(data.proficiencyLevel);

    const personSkill = await SkillRepository.assignPersonSkill({
      organizationId,
      personId,
      skillId: data.skillId,
      proficiencyLevel: data.proficiencyLevel,
    });

    eventBus.publish({
      eventName: 'PersonSkillAssigned',
      organizationId,
      actorId,
      entityType: 'PersonSkill',
      entityId: personSkill.id,
      payload: { personId, skillId: data.skillId, level: data.proficiencyLevel },
      requestId,
    });

    return personSkill;
  }

  public static async listPersonSkills(organizationId: string, personId: string) {
    const person = await PeopleRepository.findPersonById(organizationId, personId);
    if (!person) {
      throw new NotFoundError('Person not found');
    }
    return SkillRepository.listPersonSkills(organizationId, personId);
  }

  public static async removePersonSkill(
    organizationId: string,
    personSkillId: string,
    actorId?: string,
    requestId?: string
  ) {
    const removed = await SkillRepository.removePersonSkill(organizationId, personSkillId);
    if (!removed) {
      throw new NotFoundError('Person skill assignment not found');
    }

    eventBus.publish({
      eventName: 'PersonSkillRemoved',
      organizationId,
      actorId,
      entityType: 'PersonSkill',
      entityId: personSkillId,
      requestId,
    });

    return true;
  }
}
