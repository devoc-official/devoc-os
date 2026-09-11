import { MeetingTypeRepository } from '../infrastructure/meeting-type.repository.js';
import { MeetingType } from '../domain/meeting.entity.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';

export const DEFAULT_MEETING_TYPES = [
  { code: 'project', name: 'Project Sync & Review', description: 'Project status, architecture, and planning meetings' },
  { code: 'team', name: 'Team Sync', description: 'Regular team standup and sync meeting' },
  { code: 'one_on_one', name: '1-on-1 Sync', description: 'One on one meeting between manager/mentor and person' },
  { code: 'review', name: 'Review Session', description: 'Code, product, or artifact review session' },
  { code: 'planning', name: 'Sprint & Strategy Planning', description: 'Planning session for goals, deliverables, and roadmap' },
  { code: 'client', name: 'Client Engagement', description: 'Meeting with external client or partner' },
  { code: 'academy', name: 'Academy & Learning', description: 'Mentorship, training, or workshop meeting' },
  { code: 'management', name: 'Management & Governance', description: 'Executive or leadership alignment meeting' },
  { code: 'other', name: 'General Collaboration', description: 'Other organizational collaboration meeting' },
];

export class MeetingTypeService {
  public static async seedDefaultMeetingTypes(organizationId: string): Promise<MeetingType[]> {
    const existing = await MeetingTypeRepository.findAllTypes(organizationId);
    const existingCodes = new Set(existing.map((t) => t.code));

    const created: MeetingType[] = [];
    for (const def of DEFAULT_MEETING_TYPES) {
      if (!existingCodes.has(def.code)) {
        const type = await MeetingTypeRepository.createType({
          organizationId,
          code: def.code,
          name: def.name,
          description: def.description,
          isActive: true,
        });
        created.push(type);
      }
    }

    return MeetingTypeRepository.findAllTypes(organizationId);
  }

  public static async createType(
    organizationId: string,
    data: {
      code: string;
      name: string;
      description?: string | null;
      isActive?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MeetingType> {
    const existing = await MeetingTypeRepository.findTypeByCode(organizationId, data.code);
    if (existing) {
      throw new ValidationError(`Meeting type with code '${data.code}' already exists in organization`);
    }

    return MeetingTypeRepository.createType({
      organizationId,
      code: data.code,
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      metadata: data.metadata,
    });
  }

  public static async listTypes(
    organizationId: string,
    activeOnly: boolean = false
  ): Promise<MeetingType[]> {
    return MeetingTypeRepository.findAllTypes(organizationId, activeOnly);
  }

  public static async getTypeById(
    organizationId: string,
    typeId: string
  ): Promise<MeetingType> {
    const type = await MeetingTypeRepository.findTypeById(organizationId, typeId);
    if (!type) {
      throw new NotFoundError(`Meeting type '${typeId}' not found in organization`);
    }
    return type;
  }

  public static async updateType(
    organizationId: string,
    typeId: string,
    updates: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MeetingType> {
    const updated = await MeetingTypeRepository.updateType(organizationId, typeId, updates);
    if (!updated) {
      throw new NotFoundError(`Meeting type '${typeId}' not found in organization`);
    }
    return updated;
  }
}
