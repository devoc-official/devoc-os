import { Request, Response, NextFunction } from 'express';
import { LearningProgramService } from '../application/learning-program.service.js';

const programService = new LearningProgramService();

export async function createProgramController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const actorId = req.user?.id || 'system';
    const program = await programService.createProgram(orgId, req.body, actorId);
    res.status(201).json({ data: program.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function listProgramsController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const status = req.query.status as string;
    const programs = await programService.listPrograms(orgId, status);
    res.json({ data: programs.map((p) => p.toJSON()), meta: { count: programs.length } });
  } catch (err) {
    next(err);
  }
}

export async function getProgramByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const programId = req.params.programId as string;
    const program = await programService.getProgramById(orgId, programId);
    res.json({ data: program.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function updateProgramController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const programId = req.params.programId as string;
    const actorId = req.user?.id || 'system';
    const updated = await programService.updateProgram(orgId, programId, req.body, actorId);
    res.json({ data: updated.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function archiveProgramController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const programId = req.params.programId as string;
    const actorId = req.user?.id || 'system';
    const archived = await programService.archiveProgram(orgId, programId, actorId);
    res.json({ data: archived.toJSON(), meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function addMilestoneController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const programId = req.params.programId as string;
    const actorId = req.user?.id || 'system';
    const milestone = await programService.addMilestone(orgId, programId, req.body, actorId);
    res.status(201).json({ data: milestone, meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function listMilestonesController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const programId = req.params.programId as string;
    const milestones = await programService.listMilestones(orgId, programId);
    res.json({ data: milestones, meta: { count: milestones.length } });
  } catch (err) {
    next(err);
  }
}

export async function addActivityDefController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const programId = req.params.programId as string;
    const milestoneId = req.params.milestoneId as string;
    const actorId = req.user?.id || 'system';
    const actDef = await programService.addActivityDefinition(orgId, programId, milestoneId, req.body, actorId);
    res.status(201).json({ data: actDef, meta: {} });
  } catch (err) {
    next(err);
  }
}

export async function listActivityDefsController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const programId = req.params.programId as string;
    const milestoneId = req.params.milestoneId as string;
    const defs = await programService.listActivityDefinitions(orgId, programId, milestoneId);
    res.json({ data: defs, meta: { count: defs.length } });
  } catch (err) {
    next(err);
  }
}
