import { getDbClient } from '../database/index.js';
import { logger } from '../shared/logging/logger.js';

export interface EventRegistryEntry {
  id: string;
  eventName: string;
  version: string;
  sourceModule: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CANONICAL_EVENT_CATALOG: Array<{
  eventName: string;
  version: string;
  sourceModule: string;
  description: string;
}> = [
  // M1 Organization
  { eventName: 'organization.created', version: '1.0', sourceModule: 'organization', description: 'Organization tenant created' },
  { eventName: 'organization.updated', version: '1.0', sourceModule: 'organization', description: 'Organization properties updated' },
  { eventName: 'branch.created', version: '1.0', sourceModule: 'organization', description: 'Branch added to organization' },

  // M2 People
  { eventName: 'person.created', version: '1.0', sourceModule: 'people', description: 'Person record created' },
  { eventName: 'employment.assigned', version: '1.0', sourceModule: 'people', description: 'Employment assigned to person' },

  // M3 Assignments
  { eventName: 'assignment.created', version: '1.0', sourceModule: 'assignments', description: 'Generic organizational assignment created' },
  { eventName: 'assignment.updated', version: '1.0', sourceModule: 'assignments', description: 'Assignment capacity or status updated' },

  // M4 Projects & Tasks
  { eventName: 'project.created', version: '1.0', sourceModule: 'projects', description: 'Project created' },
  { eventName: 'task.created', version: '1.0', sourceModule: 'projects', description: 'Task created' },
  { eventName: 'task.completed', version: '1.0', sourceModule: 'projects', description: 'Task completed' },

  // M5 Work
  { eventName: 'work.recorded', version: '1.0', sourceModule: 'work', description: 'Work log activity recorded' },
  { eventName: 'outcome.delivered', version: '1.0', sourceModule: 'work', description: 'Work outcome delivered' },

  // M6 Meetings
  { eventName: 'meeting.scheduled', version: '1.0', sourceModule: 'meetings', description: 'Meeting scheduled' },
  { eventName: 'meeting.completed', version: '1.0', sourceModule: 'meetings', description: 'Meeting completed with decisions/notes' },

  // M7 Learning
  { eventName: 'learning.enrolled', version: '1.0', sourceModule: 'learning', description: 'Student enrolled in learning program' },
  { eventName: 'learning.review.completed', version: '1.0', sourceModule: 'learning', description: 'Student milestone review completed' },

  // M8 Evaluation
  { eventName: 'evaluation.completed', version: '1.0', sourceModule: 'evaluation', description: 'Performance evaluation completed' },
  { eventName: 'evaluation.template.created', version: '1.0', sourceModule: 'evaluation', description: 'Evaluation template created' },

  // M9 Finance
  { eventName: 'financial_obligation.created', version: '1.0', sourceModule: 'finance', description: 'Financial obligation created' },
  { eventName: 'financial_obligation.issued', version: '1.0', sourceModule: 'finance', description: 'Financial obligation issued for billing' },
  { eventName: 'financial_obligation.updated', version: '1.0', sourceModule: 'finance', description: 'Financial draft obligation details updated' },
  { eventName: 'financial_obligation.paid', version: '1.0', sourceModule: 'finance', description: 'Financial obligation fully settled' },
  { eventName: 'financial_obligation.cancelled', version: '1.0', sourceModule: 'finance', description: 'Financial obligation cancelled' },
  { eventName: 'financial_transaction.created', version: '1.0', sourceModule: 'finance', description: 'Financial transaction created' },
  { eventName: 'financial_transaction.posted', version: '1.0', sourceModule: 'finance', description: 'Financial transaction posted' },
  { eventName: 'financial_transaction.reversed', version: '1.0', sourceModule: 'finance', description: 'Financial transaction reversed' },
  { eventName: 'financial_allocation.created', version: '1.0', sourceModule: 'finance', description: 'Financial transaction allocation recorded' },
  { eventName: 'financial_adjustment.created', version: '1.0', sourceModule: 'finance', description: 'Financial adjustment added' },
  { eventName: 'budget.created', version: '1.0', sourceModule: 'finance', description: 'Operational budget created' },
  { eventName: 'budget.updated', version: '1.0', sourceModule: 'finance', description: 'Operational budget updated' },

  // M12 Admin & Platform Management
  { eventName: 'organization.provisioned', version: '1.0', sourceModule: 'admin', description: 'Tenant organization provisioned by platform admin' },
  { eventName: 'organization.suspended', version: '1.0', sourceModule: 'admin', description: 'Tenant organization suspended' },
  { eventName: 'organization.reactivated', version: '1.0', sourceModule: 'admin', description: 'Tenant organization reactivated' },
  { eventName: 'organization.settings_updated', version: '1.0', sourceModule: 'admin', description: 'Organization operational settings updated' },
  { eventName: 'person.user_linked', version: '1.0', sourceModule: 'admin', description: 'Person linked to user account' },
  { eventName: 'person.user_unlinked', version: '1.0', sourceModule: 'admin', description: 'Person unlinked from user account' },
  { eventName: 'role.context_assigned', version: '1.0', sourceModule: 'admin', description: 'Contextual role assigned to person' },
  { eventName: 'membership.suspended', version: '1.0', sourceModule: 'admin', description: 'Organization member access suspended' },
  { eventName: 'master_data.created', version: '1.0', sourceModule: 'admin', description: 'Master data entity created' },
  { eventName: 'master_data.retired', version: '1.0', sourceModule: 'admin', description: 'Master data entity deactivated or retired' },
  { eventName: 'feature_configuration.updated', version: '1.0', sourceModule: 'admin', description: 'Feature configuration toggle or parameter updated' },

  // M13 Recruitment
  { eventName: 'recruitment.position.created', version: '1.0', sourceModule: 'recruitment', description: 'Hiring position requisition created' },
  { eventName: 'recruitment.position.opened', version: '1.0', sourceModule: 'recruitment', description: 'Position opened for recruitment' },
  { eventName: 'recruitment.position.paused', version: '1.0', sourceModule: 'recruitment', description: 'Position hiring paused' },
  { eventName: 'recruitment.position.closed', version: '1.0', sourceModule: 'recruitment', description: 'Position closed (hiring-terminal)' },
  { eventName: 'recruitment.candidate.created', version: '1.0', sourceModule: 'recruitment', description: 'Candidate profile created' },
  { eventName: 'recruitment.candidate.updated', version: '1.0', sourceModule: 'recruitment', description: 'Candidate profile updated' },
  { eventName: 'recruitment.application.created', version: '1.0', sourceModule: 'recruitment', description: 'Candidate applied for position' },
  { eventName: 'recruitment.application.stage_changed', version: '1.0', sourceModule: 'recruitment', description: 'Application advanced to new stage' },
  { eventName: 'recruitment.application.rejected', version: '1.0', sourceModule: 'recruitment', description: 'Application rejected' },
  { eventName: 'recruitment.application.withdrawn', version: '1.0', sourceModule: 'recruitment', description: 'Application withdrawn' },
  { eventName: 'recruitment.trial.scheduled', version: '1.0', sourceModule: 'recruitment', description: 'Candidate trial scheduled' },
  { eventName: 'recruitment.trial.started', version: '1.0', sourceModule: 'recruitment', description: 'Candidate trial activated' },
  { eventName: 'recruitment.trial.completed', version: '1.0', sourceModule: 'recruitment', description: 'Candidate trial concluded' },
  { eventName: 'recruitment.offer.issued', version: '1.0', sourceModule: 'recruitment', description: 'Employment offer issued' },
  { eventName: 'recruitment.offer.accepted', version: '1.0', sourceModule: 'recruitment', description: 'Employment offer accepted' },
  { eventName: 'recruitment.offer.rejected', version: '1.0', sourceModule: 'recruitment', description: 'Employment offer rejected' },
  { eventName: 'recruitment.offer.rescinded', version: '1.0', sourceModule: 'recruitment', description: 'Employment offer rescinded' },
  { eventName: 'recruitment.candidate.hired', version: '1.0', sourceModule: 'recruitment', description: 'Candidate converted to organizational person and hired' },
];

export class EventRegistryService {
  public static async seedEventRegistry(): Promise<void> {
    const db = getDbClient();
    for (const entry of CANONICAL_EVENT_CATALOG) {
      await db.query(
        `INSERT INTO event_registry (event_name, version, source_module, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_name, version) DO UPDATE
         SET source_module = EXCLUDED.source_module, description = EXCLUDED.description, updated_at = NOW();`,
        [entry.eventName, entry.version, entry.sourceModule, entry.description]
      );
    }
    logger.info(`Seeded ${CANONICAL_EVENT_CATALOG.length} canonical domain event definitions into event_registry.`);
  }

  public static async listRegisteredEvents(): Promise<EventRegistryEntry[]> {
    const db = getDbClient();
    const res = await db.query<any>(
      `SELECT * FROM event_registry WHERE is_active = TRUE ORDER BY source_module ASC, event_name ASC;`
    );

    return res.rows.map((r) => ({
      id: r.id,
      eventName: r.event_name,
      version: r.version,
      sourceModule: r.source_module,
      description: r.description,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
}
