import { AssignmentRepository } from '../infrastructure/assignment.repository.js';
import { PeopleRepository } from '../../people/infrastructure/people.repository.js';
import { TargetResolverRegistry } from '../domain/target-resolver.registry.js';
import {
  Assignment,
  AssignmentHistory,
  AssignmentStatus,
  CapacityType,
  AuthorityType,
  canTransitionAssignmentStatus,
  validateAssignmentDates,
  validateActivationTime,
} from '../domain/assignment.entity.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { eventBus } from '../../../events/event-bus.js';

export interface CreateAssignmentDTO {
  organizationId: string;
  personId: string;
  targetType: string;
  targetId: string;
  assignmentType: string;
  roleContext?: string | null;
  status?: AssignmentStatus;
  startAt: Date;
  endAt?: Date | null;
  capacityType?: CapacityType;
  capacityValue?: number;
  capacityUnit?: string;
  authorityType?: AuthorityType;
  assignedByPersonId?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
  actorPersonId?: string | null;
}

export interface UpdateAssignmentDTO {
  roleContext?: string | null;
  endAt?: Date | null;
  capacityType?: CapacityType;
  capacityValue?: number;
  capacityUnit?: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
  actorPersonId?: string | null;
}

export interface AssignmentWithWarnings {
  assignment: Assignment;
  warnings: string[];
}

export class AssignmentService {
  private repository: AssignmentRepository;

  constructor() {
    this.repository = new AssignmentRepository();
  }

  public async createAssignment(data: CreateAssignmentDTO): Promise<AssignmentWithWarnings> {
    // 1. Verify Person existence and tenant scoping
    const person = await PeopleRepository.findPersonById(data.organizationId, data.personId);
    if (!person) {
      throw new NotFoundError(`Person '${data.personId}' not found in organization`);
    }

    // 2. Validate Target via TargetResolverRegistry
    const targetRegistry = TargetResolverRegistry.getInstance();
    await targetRegistry.resolveTarget(data.organizationId, data.targetType, data.targetId);

    // 3. Duplicate Active Assignment Check
    const activeDuplicate = await this.repository.findActiveDuplicate(
      data.organizationId,
      data.personId,
      data.targetType,
      data.targetId,
      data.assignmentType
    );
    if (activeDuplicate) {
      throw new ValidationError(
        `Active or scheduled assignment already exists for this person on target '${data.targetId}' with type '${data.assignmentType}'`
      );
    }

    // 4. Validate Dates & Activation Status
    const status = data.status || 'scheduled';
    validateAssignmentDates(data.startAt, data.endAt);
    validateActivationTime(status, data.startAt);

    // 5. Calculate Capacity Conflict Warnings (Non-blocking)
    const warnings: string[] = [];
    const activeAssignments = await this.repository.findActiveByPerson(data.organizationId, data.personId);
    const capacityUnit = data.capacityUnit || 'percentage';
    const capacityValue = data.capacityValue ?? 100;

    let currentTotalCapacity = activeAssignments
      .filter((a) => a.capacityUnit === capacityUnit)
      .reduce((sum, a) => sum + a.capacityValue, 0);

    const projectedCapacity = currentTotalCapacity + capacityValue;

    if (capacityUnit === 'percentage' && projectedCapacity > 100) {
      warnings.push(
        `Capacity Warning: Total percentage allocation for person (${projectedCapacity}%) exceeds standard 100% threshold.`
      );
    } else if (capacityUnit === 'hours_per_week' && projectedCapacity > 40) {
      warnings.push(
        `Capacity Warning: Total workload (${projectedCapacity} hrs/week) exceeds standard 40 hrs/week threshold.`
      );
    }

    // 6. Create Assignment Record
    const assignment = await this.repository.create({
      ...data,
      status,
      capacityUnit,
      capacityValue,
    });

    // 7. Append Initial History Entry
    await this.repository.appendHistory({
      organizationId: data.organizationId,
      assignmentId: assignment.id,
      previousStatus: null,
      newStatus: assignment.status,
      reason: 'Initial assignment creation',
      actorUserId: data.actorUserId,
      actorPersonId: data.actorPersonId,
    });

    // 8. Publish Domain Event
    eventBus.publish({
      eventName: 'assignment.created',
      organizationId: data.organizationId,
      actorId: data.actorUserId || undefined,
      entityType: 'assignment',
      entityId: assignment.id,
      payload: {
        personId: assignment.personId,
        targetType: assignment.targetType,
        targetId: assignment.targetId,
        assignmentType: assignment.assignmentType,
        status: assignment.status,
        warnings,
      },
    });

    return { assignment, warnings };
  }

  public async getAssignmentById(organizationId: string, assignmentId: string): Promise<Assignment> {
    const assignment = await this.repository.findById(organizationId, assignmentId);
    if (!assignment) {
      throw new NotFoundError(`Assignment '${assignmentId}' not found in organization`);
    }
    return assignment;
  }

  public async listAssignments(
    organizationId: string,
    filters?: {
      personId?: string;
      targetType?: string;
      targetId?: string;
      status?: AssignmentStatus;
    }
  ): Promise<Assignment[]> {
    return this.repository.findAll(organizationId, filters);
  }

  public async getAssignmentsByPerson(organizationId: string, personId: string): Promise<Assignment[]> {
    const person = await PeopleRepository.findPersonById(organizationId, personId);
    if (!person) {
      throw new NotFoundError(`Person '${personId}' not found in organization`);
    }
    return this.repository.findAll(organizationId, { personId });
  }

  public async updateAssignment(
    organizationId: string,
    assignmentId: string,
    dto: UpdateAssignmentDTO
  ): Promise<Assignment> {
    const existing = await this.getAssignmentById(organizationId, assignmentId);

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new ValidationError(`Cannot update a completed or cancelled assignment`);
    }

    if (dto.endAt !== undefined) {
      validateAssignmentDates(existing.startAt, dto.endAt);
    }

    const updated = await this.repository.update(organizationId, assignmentId, dto);
    if (!updated) {
      throw new NotFoundError(`Assignment '${assignmentId}' not found`);
    }

    // Publish event
    eventBus.publish({
      eventName: 'assignment.updated',
      organizationId,
      actorId: dto.actorUserId || undefined,
      entityType: 'assignment',
      entityId: assignmentId,
      payload: { updates: dto },
    });

    return updated;
  }

  public async transitionStatus(
    organizationId: string,
    assignmentId: string,
    targetStatus: AssignmentStatus,
    reason?: string,
    actorUserId?: string,
    actorPersonId?: string
  ): Promise<Assignment> {
    const existing = await this.getAssignmentById(organizationId, assignmentId);

    if (!canTransitionAssignmentStatus(existing.status, targetStatus)) {
      throw new ValidationError(
        `Invalid status transition from '${existing.status}' to '${targetStatus}'`
      );
    }

    if (targetStatus === 'active') {
      validateActivationTime(targetStatus, existing.startAt);
    }

    const updated = await this.repository.updateStatus(organizationId, assignmentId, targetStatus);
    if (!updated) {
      throw new NotFoundError(`Assignment '${assignmentId}' not found`);
    }

    // Append History Record
    await this.repository.appendHistory({
      organizationId,
      assignmentId,
      previousStatus: existing.status,
      newStatus: targetStatus,
      reason: reason || `Status changed to ${targetStatus}`,
      actorUserId,
      actorPersonId,
    });

    // Event name mapping
    const eventNameMap: Record<AssignmentStatus, string> = {
      scheduled: 'assignment.updated',
      active: 'assignment.activated',
      paused: 'assignment.paused',
      completed: 'assignment.completed',
      cancelled: 'assignment.cancelled',
    };

    eventBus.publish({
      eventName: eventNameMap[targetStatus],
      organizationId,
      actorId: actorUserId || undefined,
      entityType: 'assignment',
      entityId: assignmentId,
      payload: {
        previousStatus: existing.status,
        newStatus: targetStatus,
        reason,
      },
    });

    return updated;
  }

  public async getAssignmentHistory(organizationId: string, assignmentId: string): Promise<AssignmentHistory[]> {
    // Verify assignment exists and tenant matches
    await this.getAssignmentById(organizationId, assignmentId);
    return this.repository.getHistory(organizationId, assignmentId);
  }
}
