import { LearningProgramRepository } from '../infrastructure/learning-program.repository.js';
import { LearningProgram, ProgramMilestoneProps, ActivityDefinitionProps } from '../domain/learning-program.entity.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { AuditService } from '../../../audit/audit.service.js';
import { eventBus } from '../../../events/event-bus.js';

export interface CreateProgramDTO {
  name: string;
  code: string;
  description?: string;
  version?: number;
  metadata?: Record<string, any>;
}

export interface UpdateProgramDTO {
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateMilestoneDTO {
  name: string;
  description?: string;
  sequence?: number;
  required?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateActivityDefDTO {
  title: string;
  description?: string;
  activityType: string;
  sequence?: number;
  required?: boolean;
  metadata?: Record<string, any>;
}

export class LearningProgramService {
  private repo: LearningProgramRepository;

  constructor() {
    this.repo = new LearningProgramRepository();
  }

  public async createProgram(organizationId: string, dto: CreateProgramDTO, actorId: string): Promise<LearningProgram> {
    if (!dto.name || !dto.code) {
      throw new ValidationError('Learning program name and code are required');
    }

    const existing = await this.repo.findProgramByCode(organizationId, dto.code);
    if (existing) {
      throw new ValidationError(`Learning program code '${dto.code}' already exists in organization`);
    }

    const program = await this.repo.createProgram({
      organizationId,
      name: dto.name,
      code: dto.code,
      description: dto.description || null,
      status: 'draft',
      version: dto.version || 1,
      metadata: dto.metadata || {},
    });

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'learning_program.created',
      entityType: 'learning_program',
      entityId: program.id,
      payload: { ...program.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'learning_program.created',
      organizationId,
      actorId,
      entityType: 'learning_program',
      entityId: program.id,
      payload: { programId: program.id, code: program.code },
    });

    return program;
  }

  public async getProgramById(organizationId: string, programId: string): Promise<LearningProgram> {
    const program = await this.repo.findProgramById(organizationId, programId);
    if (!program) {
      throw new NotFoundError(`Learning program '${programId}' not found`);
    }
    return program;
  }

  public async listPrograms(organizationId: string, status?: string): Promise<LearningProgram[]> {
    return this.repo.listPrograms(organizationId, status);
  }

  public async updateProgram(organizationId: string, programId: string, dto: UpdateProgramDTO, actorId: string): Promise<LearningProgram> {
    const program = await this.getProgramById(organizationId, programId);

    const updated = new LearningProgram({
      ...program.toJSON(),
      name: dto.name ?? program.name,
      description: dto.description !== undefined ? dto.description : program.description,
      metadata: dto.metadata ? { ...program.metadata, ...dto.metadata } : program.metadata,
    });

    const saved = await this.repo.updateProgram(updated);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'learning_program.updated',
      entityType: 'learning_program',
      entityId: programId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'learning_program.updated',
      organizationId,
      actorId,
      entityType: 'learning_program',
      entityId: programId,
      payload: { programId, name: saved.name },
    });

    return saved;
  }

  public async activateProgram(organizationId: string, programId: string, actorId: string): Promise<LearningProgram> {
    const program = await this.getProgramById(organizationId, programId);

    program.activate();
    const saved = await this.repo.updateProgram(program);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'learning_program.activated',
      entityType: 'learning_program',
      entityId: programId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    return saved;
  }

  public async archiveProgram(organizationId: string, programId: string, actorId: string): Promise<LearningProgram> {
    const program = await this.getProgramById(organizationId, programId);

    program.archive();
    const saved = await this.repo.updateProgram(program);

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'learning_program.archived',
      entityType: 'learning_program',
      entityId: programId,
      payload: { ...saved.toJSON() } as Record<string, unknown>,
    });

    eventBus.publish({
      eventName: 'learning_program.archived',
      organizationId,
      actorId,
      entityType: 'learning_program',
      entityId: programId,
      payload: { programId },
    });

    return saved;
  }

  // Program Milestones
  public async addMilestone(organizationId: string, programId: string, dto: CreateMilestoneDTO, actorId: string): Promise<ProgramMilestoneProps> {
    await this.getProgramById(organizationId, programId);
    if (!dto.name) {
      throw new ValidationError('Milestone name is required');
    }

    const milestone = await this.repo.createMilestone({
      organizationId,
      learningProgramId: programId,
      name: dto.name,
      description: dto.description || null,
      sequence: dto.sequence || 1,
      required: dto.required ?? true,
      metadata: dto.metadata || {},
    });

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'learning_program_milestone.created',
      entityType: 'learning_program_milestone',
      entityId: milestone.id,
      payload: { ...milestone } as Record<string, unknown>,
    });

    return milestone;
  }

  public async listMilestones(organizationId: string, programId: string): Promise<ProgramMilestoneProps[]> {
    await this.getProgramById(organizationId, programId);
    return this.repo.listMilestones(organizationId, programId);
  }

  // Activity Definitions
  public async addActivityDefinition(
    organizationId: string,
    programId: string,
    milestoneId: string,
    dto: CreateActivityDefDTO,
    actorId: string
  ): Promise<ActivityDefinitionProps> {
    await this.getProgramById(organizationId, programId);
    const milestone = await this.repo.findMilestoneById(organizationId, milestoneId);
    if (!milestone || milestone.learningProgramId !== programId) {
      throw new NotFoundError(`Milestone '${milestoneId}' not found in program`);
    }

    if (!dto.title || !dto.activityType) {
      throw new ValidationError('Activity definition title and activityType are required');
    }

    const actDef = await this.repo.createActivityDefinition({
      organizationId,
      milestoneId,
      title: dto.title,
      description: dto.description || null,
      activityType: dto.activityType,
      sequence: dto.sequence || 1,
      required: dto.required ?? true,
      metadata: dto.metadata || {},
    });

    await AuditService.recordLog({
      organizationId,
      actorId,
      action: 'learning_activity_definition.created',
      entityType: 'learning_activity_definition',
      entityId: actDef.id,
      payload: { ...actDef } as Record<string, unknown>,
    });

    return actDef;
  }

  public async listActivityDefinitions(organizationId: string, programId: string, milestoneId: string): Promise<ActivityDefinitionProps[]> {
    await this.getProgramById(organizationId, programId);
    const milestone = await this.repo.findMilestoneById(organizationId, milestoneId);
    if (!milestone || milestone.learningProgramId !== programId) {
      throw new NotFoundError(`Milestone '${milestoneId}' not found in program`);
    }
    return this.repo.listActivityDefinitions(organizationId, milestoneId);
  }
}
