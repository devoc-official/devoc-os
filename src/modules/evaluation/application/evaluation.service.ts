import { EvaluationRepository, CreateEvaluationInput } from '../infrastructure/evaluation.repository.js';
import { EvaluationTemplateRepository } from '../infrastructure/evaluation-template.repository.js';
import {
  Evaluation,
  EvaluationState,
  CriterionResult,
  EvaluationFeedback,
  FeedbackType,
  validateStateTransition,
} from '../domain/evaluation.entity.js';
import { validateCriterionValue } from '../domain/evaluation-template.entity.js';
import { AuditService } from '../../../audit/audit.service.js';
import { eventBus } from '../../../events/event-bus.js';
import { ValidationError } from '../../../shared/errors/index.js';

export class EvaluationService {
  private repository: EvaluationRepository;
  private templateRepository: EvaluationTemplateRepository;

  constructor(repository?: EvaluationRepository, templateRepository?: EvaluationTemplateRepository) {
    this.repository = repository || new EvaluationRepository();
    this.templateRepository = templateRepository || new EvaluationTemplateRepository();
  }

  public async createEvaluation(
    organizationId: string,
    input: CreateEvaluationInput,
    actorUserId?: string
  ): Promise<Evaluation> {
    const evaluation = await this.repository.createEvaluation(organizationId, input);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'EVALUATION_CREATED',
      entityType: 'evaluation',
      entityId: evaluation.id,
      payload: { templateId: evaluation.templateId, subjectId: evaluation.subjectId, state: evaluation.state },
    });

    eventBus.publish({
      eventName: 'EvaluationCreated',
      organizationId,
      actorId: actorUserId,
      entityType: 'evaluation',
      entityId: evaluation.id,
      payload: {
        templateId: evaluation.templateId,
        subjectId: evaluation.subjectId,
        state: evaluation.state,
      },
    });

    return evaluation;
  }

  public async getEvaluation(organizationId: string, evaluationId: string): Promise<Evaluation> {
    return this.repository.getEvaluationById(organizationId, evaluationId);
  }

  public async listEvaluations(
    organizationId: string,
    filters?: { state?: EvaluationState; subjectId?: string; evaluatorId?: string }
  ): Promise<Evaluation[]> {
    return this.repository.listEvaluations(organizationId, filters);
  }

  public async transitionState(
    organizationId: string,
    evaluationId: string,
    targetState: EvaluationState,
    actorUserId?: string
  ): Promise<Evaluation> {
    const currentEval = await this.repository.getEvaluationById(organizationId, evaluationId);
    validateStateTransition(currentEval.state, targetState);

    if (targetState === 'Submitted' || targetState === 'Completed') {
      const template = await this.templateRepository.getTemplateById(organizationId, currentEval.templateId);
      const results = currentEval.criterionResults || [];

      if (template.criteria && template.criteria.length > 0) {
        const resultCriterionIds = new Set(results.map((r) => r.criterionId));
        for (const crit of template.criteria) {
          if (!resultCriterionIds.has(crit.id)) {
            throw new ValidationError(`Cannot submit or complete evaluation: missing result for criterion '${crit.name}'`);
          }
        }
      }
    }

    const updated = await this.repository.updateEvaluationState(organizationId, evaluationId, targetState);

    if (targetState === 'Completed') {
      await this.finalizeEvaluationSnapshot(organizationId, updated);
    }

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'EVALUATION_STATE_CHANGED',
      entityType: 'evaluation',
      entityId: evaluationId,
      payload: { previousState: currentEval.state, newState: targetState },
    });

    eventBus.publish({
      eventName: 'EvaluationStateChanged',
      organizationId,
      actorId: actorUserId,
      entityType: 'evaluation',
      entityId: evaluationId,
      payload: {
        previousState: currentEval.state,
        newState: targetState,
      },
    });

    if (targetState === 'Completed') {
      eventBus.publish({
        eventName: 'EvaluationCompleted',
        organizationId,
        actorId: actorUserId,
        entityType: 'evaluation',
        entityId: evaluationId,
        payload: {
          subjectId: updated.subjectId,
          completedAt: updated.completedAt || new Date().toISOString(),
        },
      });
    }

    return updated;
  }

  public async submitCriterionResult(
    organizationId: string,
    evaluationId: string,
    criterionId: string,
    value: string,
    comments?: string,
    actorUserId?: string
  ): Promise<CriterionResult> {
    const evaluation = await this.repository.getEvaluationById(organizationId, evaluationId);

    if (evaluation.state === 'Completed' || evaluation.state === 'Cancelled') {
      throw new ValidationError(`Cannot submit criterion results for evaluation in state '${evaluation.state}'`);
    }

    const template = await this.templateRepository.getTemplateById(organizationId, evaluation.templateId);
    const criterion = template.criteria?.find((c) => c.id === criterionId);
    if (!criterion) {
      throw new ValidationError(`Criterion '${criterionId}' not found in template`);
    }

    validateCriterionValue(criterion.criterionType, value);

    const result = await this.repository.addOrUpdateCriterionResult(organizationId, evaluationId, criterionId, value, comments);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'CRITERION_RESULT_SUBMITTED',
      entityType: 'evaluation',
      entityId: evaluationId,
      payload: { criterionId, value },
    });

    eventBus.publish({
      eventName: 'CriterionResultAdded',
      organizationId,
      actorId: actorUserId,
      entityType: 'evaluation',
      entityId: evaluationId,
      payload: {
        criterionId,
        value,
      },
    });

    return result;
  }

  public async addFeedback(
    organizationId: string,
    evaluationId: string,
    feedbackType: FeedbackType,
    payload: Record<string, any>,
    actorUserId?: string
  ): Promise<EvaluationFeedback> {
    const evaluation = await this.repository.getEvaluationById(organizationId, evaluationId);

    if (evaluation.state === 'Completed' || evaluation.state === 'Cancelled') {
      throw new ValidationError(`Cannot add feedback to evaluation in state '${evaluation.state}'`);
    }

    const feedback = await this.repository.addFeedback(organizationId, evaluationId, feedbackType, payload);

    await AuditService.recordLog({
      organizationId,
      actorId: actorUserId,
      action: 'EVALUATION_FEEDBACK_ADDED',
      entityType: 'evaluation',
      entityId: evaluationId,
      payload: { feedbackType },
    });

    return feedback;
  }

  public async getHistorySnapshot(organizationId: string, evaluationId: string): Promise<Record<string, any>> {
    await this.repository.getEvaluationById(organizationId, evaluationId);
    return this.repository.getHistorySnapshot(evaluationId);
  }

  private async finalizeEvaluationSnapshot(organizationId: string, evaluation: Evaluation): Promise<void> {
    const template = await this.templateRepository.getTemplateById(organizationId, evaluation.templateId);
    const results = evaluation.criterionResults || [];

    let totalWeight = 0;
    let weightedScoreSum = 0;
    let numericCriteriaCount = 0;

    for (const r of results) {
      const crit = template.criteria?.find((c) => c.id === r.criterionId);
      if (crit && crit.criterionType === 'numeric') {
        const val = Number(r.value);
        if (!isNaN(val)) {
          weightedScoreSum += val * crit.weight;
          totalWeight += crit.weight;
          numericCriteriaCount++;
        }
      }
    }

    const outcomesToSave: { outcomeKey: string; outcomeValue: string }[] = [];

    if (numericCriteriaCount > 0 && totalWeight > 0) {
      const avgScore = weightedScoreSum / totalWeight;
      outcomesToSave.push({ outcomeKey: 'WeightedScore', outcomeValue: avgScore.toFixed(2) });

      let performanceRating = 'Satisfactory';
      if (avgScore >= 4.5) performanceRating = 'Exceptional';
      else if (avgScore >= 3.5) performanceRating = 'Strong';
      else if (avgScore < 2.5) performanceRating = 'Needs Improvement';

      outcomesToSave.push({ outcomeKey: 'PerformanceRating', outcomeValue: performanceRating });
    } else {
      outcomesToSave.push({ outcomeKey: 'CompletionStatus', outcomeValue: 'Completed' });
    }

    const savedOutcomes = await this.repository.saveOutcomes(organizationId, evaluation.id, outcomesToSave);
    evaluation.outcomes = savedOutcomes;

    const snapshotData = {
      evaluationId: evaluation.id,
      organizationId: evaluation.organizationId,
      subjectId: evaluation.subjectId,
      evaluatorIds: evaluation.evaluatorIds,
      state: evaluation.state,
      completedAt: evaluation.completedAt,
      template: {
        id: template.id,
        name: template.name,
        version: template.version,
        criteria: template.criteria,
      },
      criterionResults: results,
      feedback: evaluation.feedback || [],
      outcomes: savedOutcomes,
    };

    await this.repository.createHistorySnapshot(evaluation.id, snapshotData);
  }
}
