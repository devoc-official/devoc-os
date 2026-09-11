import { Request, Response } from 'express';
import { AssignmentService } from '../application/assignment.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';
import { AssignmentStatus } from '../domain/assignment.entity.js';

const getParamId = (req: Request, paramName: string): string => {
  const val = req.params[paramName];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class AssignmentController {
  private static service = new AssignmentService();

  public static async createAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const {
        personId,
        targetType,
        targetId,
        assignmentType,
        roleContext,
        status,
        startAt,
        endAt,
        capacityType,
        capacityValue,
        capacityUnit,
        authorityType,
        assignedByPersonId,
        notes,
        metadata,
      } = req.body;

      if (!personId || !targetType || !targetId || !assignmentType || !startAt) {
        throw new ValidationError(
          'personId, targetType, targetId, assignmentType, and startAt are required fields'
        );
      }

      const result = await AssignmentController.service.createAssignment({
        organizationId,
        personId,
        targetType,
        targetId,
        assignmentType,
        roleContext,
        status,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        capacityType,
        capacityValue: capacityValue !== undefined ? Number(capacityValue) : undefined,
        capacityUnit,
        authorityType,
        assignedByPersonId,
        notes,
        metadata,
        actorUserId: req.user?.id,
      });

      sendSuccess(
        res,
        result.assignment,
        201,
        result.warnings.length > 0 ? { warnings: result.warnings } : undefined
      );
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const personId = req.query.personId as string | undefined;
      const targetType = req.query.targetType as string | undefined;
      const targetId = req.query.targetId as string | undefined;
      const status = req.query.status as AssignmentStatus | undefined;

      const assignments = await AssignmentController.service.listAssignments(organizationId, {
        personId,
        targetType,
        targetId,
        status,
      });

      sendSuccess(res, assignments, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const assignmentId = getParamId(req, 'assignmentId');

      const assignment = await AssignmentController.service.getAssignmentById(
        organizationId,
        assignmentId
      );
      sendSuccess(res, assignment, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const assignmentId = getParamId(req, 'assignmentId');
      const { roleContext, endAt, capacityType, capacityValue, capacityUnit, notes, metadata } =
        req.body;

      const updated = await AssignmentController.service.updateAssignment(
        organizationId,
        assignmentId,
        {
          roleContext,
          endAt: endAt ? new Date(endAt) : endAt === null ? null : undefined,
          capacityType,
          capacityValue: capacityValue !== undefined ? Number(capacityValue) : undefined,
          capacityUnit,
          notes,
          metadata,
          actorUserId: req.user?.id,
        }
      );

      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async activateAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const assignmentId = getParamId(req, 'assignmentId');
      const { reason } = req.body || {};

      const updated = await AssignmentController.service.transitionStatus(
        organizationId,
        assignmentId,
        'active',
        reason,
        req.user?.id
      );

      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async pauseAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const assignmentId = getParamId(req, 'assignmentId');
      const { reason } = req.body || {};

      const updated = await AssignmentController.service.transitionStatus(
        organizationId,
        assignmentId,
        'paused',
        reason,
        req.user?.id
      );

      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async completeAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const assignmentId = getParamId(req, 'assignmentId');
      const { reason } = req.body || {};

      const updated = await AssignmentController.service.transitionStatus(
        organizationId,
        assignmentId,
        'completed',
        reason,
        req.user?.id
      );

      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async cancelAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const assignmentId = getParamId(req, 'assignmentId');
      const { reason } = req.body || {};

      const updated = await AssignmentController.service.transitionStatus(
        organizationId,
        assignmentId,
        'cancelled',
        reason,
        req.user?.id
      );

      sendSuccess(res, updated, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getAssignmentHistory(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const assignmentId = getParamId(req, 'assignmentId');

      const history = await AssignmentController.service.getAssignmentHistory(
        organizationId,
        assignmentId
      );
      sendSuccess(res, history, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getPersonAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.tenantContext!;
      const personId = getParamId(req, 'personId');

      const assignments = await AssignmentController.service.getAssignmentsByPerson(
        organizationId,
        personId
      );
      sendSuccess(res, assignments, 200);
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
