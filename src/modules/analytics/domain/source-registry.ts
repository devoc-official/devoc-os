import {
  LogicalSourceDefinition,
  AggregationType,
  CalculationSpec,
} from './source-registry.types.js';
import { ValidationError } from '../../../shared/errors/index.js';

export * from './source-registry.types.js';

const ALL_AGGREGATIONS: AggregationType[] = [
  'COUNT',
  'SUM',
  'AVERAGE',
  'RATE',
  'PERCENTAGE',
  'WEIGHTED_AGGREGATION',
  'TREND',
];

export const ANALYTICS_SOURCE_REGISTRY: Record<string, LogicalSourceDefinition> = {
  ORGANIZATION: {
    logicalSource: 'ORGANIZATION',
    physicalTable: 'organizations',
    primaryKey: 'id',
    tenantColumn: null, // Tenant boundary root
    allowedFields: ['id', 'name', 'slug', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['slug', 'status', 'created_at'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  USER: {
    logicalSource: 'USER',
    physicalTable: 'users',
    primaryKey: 'id',
    tenantColumn: null, // Global user identity
    allowedFields: ['id', 'email', 'full_name', 'is_active', 'is_platform_admin', 'created_at', 'updated_at'],
    allowedDimensions: ['is_active', 'is_platform_admin', 'created_at'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  ORGANIZATION_MEMBERSHIP: {
    logicalSource: 'ORGANIZATION_MEMBERSHIP',
    physicalTable: 'organization_memberships',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'user_id', 'role', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['user_id', 'role', 'status', 'created_at'],
    allowedRelationships: {
      USER: { targetEntity: 'USER', onField: 'user_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  BRANCH: {
    logicalSource: 'BRANCH',
    physicalTable: 'branches',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'code', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'status'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  BUSINESS_UNIT: {
    logicalSource: 'BUSINESS_UNIT',
    physicalTable: 'business_units',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'code', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'status'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  DEPARTMENT: {
    logicalSource: 'DEPARTMENT',
    physicalTable: 'departments',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'code', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'status'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  TEAM: {
    logicalSource: 'TEAM',
    physicalTable: 'teams',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'code', 'status', 'is_temporary', 'department_id', 'business_unit_id', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'status', 'is_temporary', 'department_id', 'business_unit_id'],
    allowedRelationships: {
      DEPARTMENT: { targetEntity: 'DEPARTMENT', onField: 'department_id' },
      BUSINESS_UNIT: { targetEntity: 'BUSINESS_UNIT', onField: 'business_unit_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  AUDIT_LOG: {
    logicalSource: 'AUDIT_LOG',
    physicalTable: 'audit_logs',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'actor_id', 'actor_person_id', 'action', 'entity_type', 'entity_id', 'source_module', 'ip_address', 'user_agent', 'created_at'],
    allowedDimensions: ['actor_id', 'actor_person_id', 'action', 'entity_type', 'entity_id', 'source_module', 'created_at'],
    allowedRelationships: {
      USER: { targetEntity: 'USER', onField: 'actor_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'actor_person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  PERSON: {
    logicalSource: 'PERSON',
    physicalTable: 'people',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'user_id', 'first_name', 'last_name', 'email', 'phone', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['user_id', 'status', 'created_at'],
    allowedRelationships: {
      USER: { targetEntity: 'USER', onField: 'user_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  ROLE: {
    logicalSource: 'ROLE',
    physicalTable: 'roles',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'code', 'description', 'is_system', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'is_system', 'status'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  PERSON_ROLE: {
    logicalSource: 'PERSON_ROLE',
    physicalTable: 'person_roles',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'person_id', 'role_id', 'business_unit_id', 'department_id', 'team_id', 'status', 'start_date', 'end_date', 'created_at', 'updated_at'],
    allowedDimensions: ['person_id', 'role_id', 'business_unit_id', 'department_id', 'team_id', 'status', 'start_date', 'end_date'],
    allowedRelationships: {
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
      ROLE: { targetEntity: 'ROLE', onField: 'role_id' },
      BUSINESS_UNIT: { targetEntity: 'BUSINESS_UNIT', onField: 'business_unit_id' },
      DEPARTMENT: { targetEntity: 'DEPARTMENT', onField: 'department_id' },
      TEAM: { targetEntity: 'TEAM', onField: 'team_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  EMPLOYMENT: {
    logicalSource: 'EMPLOYMENT',
    physicalTable: 'employments',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'person_id', 'employment_type', 'status', 'job_title', 'department_id', 'business_unit_id', 'branch_id', 'manager_id', 'start_date', 'end_date', 'created_at', 'updated_at'],
    allowedDimensions: ['person_id', 'employment_type', 'status', 'job_title', 'department_id', 'business_unit_id', 'branch_id', 'manager_id', 'start_date', 'end_date'],
    allowedRelationships: {
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
      DEPARTMENT: { targetEntity: 'DEPARTMENT', onField: 'department_id' },
      BUSINESS_UNIT: { targetEntity: 'BUSINESS_UNIT', onField: 'business_unit_id' },
      BRANCH: { targetEntity: 'BRANCH', onField: 'branch_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  EMPLOYMENT_HISTORY: {
    logicalSource: 'EMPLOYMENT_HISTORY',
    physicalTable: 'employment_history',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'employment_id', 'person_id', 'previous_status', 'new_status', 'effective_date', 'created_at'],
    allowedDimensions: ['employment_id', 'person_id', 'previous_status', 'new_status', 'effective_date'],
    allowedRelationships: {
      EMPLOYMENT: { targetEntity: 'EMPLOYMENT', onField: 'employment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  SKILL: {
    logicalSource: 'SKILL',
    physicalTable: 'skills',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'code', 'category', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'category', 'status'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  PERSON_SKILL: {
    logicalSource: 'PERSON_SKILL',
    physicalTable: 'person_skills',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'person_id', 'skill_id', 'proficiency_level', 'created_at', 'updated_at'],
    allowedDimensions: ['person_id', 'skill_id', 'proficiency_level'],
    allowedRelationships: {
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
      SKILL: { targetEntity: 'SKILL', onField: 'skill_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  ASSIGNMENT: {
    logicalSource: 'ASSIGNMENT',
    physicalTable: 'assignments',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'person_id', 'target_type', 'target_id', 'assignment_type', 'role_context', 'status', 'start_at', 'end_at', 'capacity_type', 'capacity_value', 'capacity_unit', 'authority_type', 'assigned_by_person_id', 'created_at', 'updated_at'],
    allowedDimensions: ['person_id', 'target_type', 'target_id', 'assignment_type', 'role_context', 'status', 'start_at', 'end_at', 'capacity_type', 'capacity_value', 'capacity_unit', 'authority_type', 'assigned_by_person_id'],
    allowedRelationships: {
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  ASSIGNMENT_HISTORY: {
    logicalSource: 'ASSIGNMENT_HISTORY',
    physicalTable: 'assignment_history',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'assignment_id', 'previous_status', 'new_status', 'actor_user_id', 'actor_person_id', 'changed_at'],
    allowedDimensions: ['assignment_id', 'previous_status', 'new_status', 'actor_user_id', 'actor_person_id', 'changed_at'],
    allowedRelationships: {
      ASSIGNMENT: { targetEntity: 'ASSIGNMENT', onField: 'assignment_id' },
      USER: { targetEntity: 'USER', onField: 'actor_user_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'actor_person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  PROJECT: {
    logicalSource: 'PROJECT',
    physicalTable: 'projects',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'key', 'project_type', 'status', 'priority', 'start_at', 'target_end_at', 'actual_end_at', 'created_by_person_id', 'created_at', 'updated_at'],
    allowedDimensions: ['key', 'name', 'project_type', 'status', 'priority', 'start_at', 'target_end_at', 'actual_end_at', 'created_by_person_id', 'created_at'],
    allowedRelationships: {
      PERSON: { targetEntity: 'PERSON', onField: 'created_by_person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  PROJECT_OWNER: {
    logicalSource: 'PROJECT_OWNER',
    physicalTable: 'project_owners',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'project_id', 'person_id', 'ownership_type', 'start_at', 'end_at', 'created_at', 'updated_at'],
    allowedDimensions: ['project_id', 'person_id', 'ownership_type', 'start_at', 'end_at'],
    allowedRelationships: {
      PROJECT: { targetEntity: 'PROJECT', onField: 'project_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  PROJECT_BUSINESS_UNIT: {
    logicalSource: 'PROJECT_BUSINESS_UNIT',
    physicalTable: 'project_business_units',
    primaryKey: ['project_id', 'business_unit_id'],
    tenantColumn: 'organization_id',
    allowedFields: ['organization_id', 'project_id', 'business_unit_id', 'created_at'],
    allowedDimensions: ['project_id', 'business_unit_id'],
    allowedRelationships: {
      PROJECT: { targetEntity: 'PROJECT', onField: 'project_id' },
      BUSINESS_UNIT: { targetEntity: 'BUSINESS_UNIT', onField: 'business_unit_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  TASK: {
    logicalSource: 'TASK',
    physicalTable: 'tasks',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'project_id', 'parent_task_id', 'title', 'description', 'task_key', 'task_type', 'status', 'priority', 'start_at', 'due_at', 'completed_at', 'created_by_person_id', 'created_at', 'updated_at'],
    allowedDimensions: ['project_id', 'parent_task_id', 'task_key', 'task_type', 'status', 'priority', 'start_at', 'due_at', 'completed_at', 'created_by_person_id', 'created_at'],
    allowedRelationships: {
      PROJECT: { targetEntity: 'PROJECT', onField: 'project_id' },
      TASK: { targetEntity: 'TASK', onField: 'parent_task_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'created_by_person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  TASK_DEPENDENCY: {
    logicalSource: 'TASK_DEPENDENCY',
    physicalTable: 'task_dependencies',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'task_id', 'depends_on_task_id', 'dependency_type', 'created_at'],
    allowedDimensions: ['task_id', 'depends_on_task_id', 'dependency_type'],
    allowedRelationships: {
      TASK: { targetEntity: 'TASK', onField: 'task_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORK_CATEGORY: {
    logicalSource: 'WORK_CATEGORY',
    physicalTable: 'work_categories',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'code', 'description', 'active', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'active'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORK_RECORD: {
    logicalSource: 'WORK_RECORD',
    physicalTable: 'work_records',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'person_id', 'target_type', 'target_id', 'assignment_id', 'category_id', 'title', 'description', 'status', 'started_at', 'ended_at', 'duration_minutes', 'created_by_person_id', 'created_at', 'updated_at'],
    allowedDimensions: ['person_id', 'target_type', 'target_id', 'assignment_id', 'category_id', 'status', 'started_at', 'ended_at', 'duration_minutes', 'created_by_person_id', 'created_at'],
    allowedRelationships: {
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
      ASSIGNMENT: { targetEntity: 'ASSIGNMENT', onField: 'assignment_id' },
      WORK_CATEGORY: { targetEntity: 'WORK_CATEGORY', onField: 'category_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  WORK_EVIDENCE: {
    logicalSource: 'WORK_EVIDENCE',
    physicalTable: 'work_evidence',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'work_record_id', 'evidence_type', 'title', 'provider', 'created_at'],
    allowedDimensions: ['work_record_id', 'evidence_type', 'provider'],
    allowedRelationships: {
      WORK_RECORD: { targetEntity: 'WORK_RECORD', onField: 'work_record_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  OUTCOME: {
    logicalSource: 'OUTCOME',
    physicalTable: 'outcomes',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'outcome_type', 'title', 'description', 'measurable_value', 'measurable_unit', 'created_by_person_id', 'created_at', 'updated_at'],
    allowedDimensions: ['title', 'outcome_type', 'measurable_unit', 'created_by_person_id', 'created_at'],
    allowedRelationships: {
      PERSON: { targetEntity: 'PERSON', onField: 'created_by_person_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  WORK_OUTCOME: {
    logicalSource: 'WORK_OUTCOME',
    physicalTable: 'work_outcomes',
    primaryKey: ['work_record_id', 'outcome_id'],
    tenantColumn: null,
    parentJoin: {
      targetEntity: 'WORK_RECORD',
      onField: 'work_record_id',
      foreignField: 'id',
    },
    allowedFields: ['work_record_id', 'outcome_id', 'contribution_type', 'contribution_value', 'created_at'],
    allowedDimensions: ['work_record_id', 'outcome_id', 'contribution_type'],
    allowedRelationships: {
      WORK_RECORD: { targetEntity: 'WORK_RECORD', onField: 'work_record_id' },
      OUTCOME: { targetEntity: 'OUTCOME', onField: 'outcome_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  MEETING_TYPE: {
    logicalSource: 'MEETING_TYPE',
    physicalTable: 'meeting_types',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'code', 'name', 'description', 'is_active', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'is_active'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  MEETING: {
    logicalSource: 'MEETING',
    physicalTable: 'meetings',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'title', 'description', 'meeting_type_id', 'status', 'scheduled_start_at', 'scheduled_end_at', 'actual_start_at', 'actual_end_at', 'location_type', 'organizer_person_id', 'created_by_person_id', 'created_at', 'updated_at'],
    allowedDimensions: ['meeting_type_id', 'status', 'scheduled_start_at', 'scheduled_end_at', 'actual_start_at', 'actual_end_at', 'location_type', 'organizer_person_id', 'created_by_person_id', 'created_at'],
    allowedRelationships: {
      MEETING_TYPE: { targetEntity: 'MEETING_TYPE', onField: 'meeting_type_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'organizer_person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  MEETING_TARGET: {
    logicalSource: 'MEETING_TARGET',
    physicalTable: 'meeting_targets',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'meeting_id', 'target_type', 'target_id', 'created_at'],
    allowedDimensions: ['meeting_id', 'target_type', 'target_id'],
    allowedRelationships: {
      MEETING: { targetEntity: 'MEETING', onField: 'meeting_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  MEETING_PARTICIPANT: {
    logicalSource: 'MEETING_PARTICIPANT',
    physicalTable: 'meeting_participants',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'meeting_id', 'person_id', 'participant_type', 'response_status', 'joined_at', 'left_at', 'created_at', 'updated_at'],
    allowedDimensions: ['meeting_id', 'person_id', 'participant_type', 'response_status', 'joined_at', 'left_at'],
    allowedRelationships: {
      MEETING: { targetEntity: 'MEETING', onField: 'meeting_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  MEETING_AGENDA_ITEM: {
    logicalSource: 'MEETING_AGENDA_ITEM',
    physicalTable: 'meeting_agenda_items',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'meeting_id', 'title', 'position', 'owner_person_id', 'duration_minutes', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['meeting_id', 'position', 'owner_person_id', 'duration_minutes', 'status'],
    allowedRelationships: {
      MEETING: { targetEntity: 'MEETING', onField: 'meeting_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'owner_person_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  MEETING_NOTE: {
    logicalSource: 'MEETING_NOTE',
    physicalTable: 'meeting_notes',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'meeting_id', 'content', 'prepared_by_person_id', 'status', 'finalized_at', 'created_at', 'updated_at'],
    allowedDimensions: ['meeting_id', 'prepared_by_person_id', 'status', 'finalized_at'],
    allowedRelationships: {
      MEETING: { targetEntity: 'MEETING', onField: 'meeting_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'prepared_by_person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  MEETING_DECISION: {
    logicalSource: 'MEETING_DECISION',
    physicalTable: 'meeting_decisions',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'meeting_id', 'title', 'decision_text', 'decided_at', 'recorded_by_person_id', 'created_at', 'updated_at'],
    allowedDimensions: ['meeting_id', 'decided_at', 'recorded_by_person_id'],
    allowedRelationships: {
      MEETING: { targetEntity: 'MEETING', onField: 'meeting_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'recorded_by_person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  MEETING_ACTION_ITEM: {
    logicalSource: 'MEETING_ACTION_ITEM',
    physicalTable: 'meeting_action_items',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'meeting_id', 'title', 'owner_person_id', 'due_at', 'status', 'task_id', 'created_at', 'updated_at'],
    allowedDimensions: ['meeting_id', 'owner_person_id', 'due_at', 'status', 'task_id'],
    allowedRelationships: {
      MEETING: { targetEntity: 'MEETING', onField: 'meeting_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'owner_person_id' },
      TASK: { targetEntity: 'TASK', onField: 'task_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  LEARNING_PROGRAM: {
    logicalSource: 'LEARNING_PROGRAM',
    physicalTable: 'learning_programs',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'code', 'description', 'status', 'version', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'status', 'version'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  LEARNING_PROGRAM_MILESTONE: {
    logicalSource: 'LEARNING_PROGRAM_MILESTONE',
    physicalTable: 'learning_program_milestones',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'learning_program_id', 'name', 'sequence', 'required', 'created_at', 'updated_at'],
    allowedDimensions: ['learning_program_id', 'sequence', 'required'],
    allowedRelationships: {
      LEARNING_PROGRAM: { targetEntity: 'LEARNING_PROGRAM', onField: 'learning_program_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  LEARNING_ACTIVITY_DEFINITION: {
    logicalSource: 'LEARNING_ACTIVITY_DEFINITION',
    physicalTable: 'learning_activity_definitions',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'milestone_id', 'title', 'activity_type', 'sequence', 'required', 'created_at', 'updated_at'],
    allowedDimensions: ['milestone_id', 'activity_type', 'sequence', 'required'],
    allowedRelationships: {
      LEARNING_PROGRAM_MILESTONE: { targetEntity: 'LEARNING_PROGRAM_MILESTONE', onField: 'milestone_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  LEARNING_ENROLLMENT: {
    logicalSource: 'LEARNING_ENROLLMENT',
    physicalTable: 'learning_enrollments',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'person_id', 'learning_program_id', 'status', 'enrolled_at', 'started_at', 'expected_end_at', 'completed_at', 'withdrawn_at', 'created_at', 'updated_at'],
    allowedDimensions: ['learning_program_id', 'person_id', 'status', 'enrolled_at', 'started_at', 'completed_at', 'withdrawn_at', 'created_at'],
    allowedRelationships: {
      LEARNING_PROGRAM: { targetEntity: 'LEARNING_PROGRAM', onField: 'learning_program_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  ENROLLMENT_MILESTONE: {
    logicalSource: 'ENROLLMENT_MILESTONE',
    physicalTable: 'enrollment_milestones',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'enrollment_id', 'source_milestone_id', 'title', 'sequence', 'status', 'started_at', 'completed_at', 'created_at', 'updated_at'],
    allowedDimensions: ['enrollment_id', 'source_milestone_id', 'sequence', 'status', 'started_at', 'completed_at'],
    allowedRelationships: {
      LEARNING_ENROLLMENT: { targetEntity: 'LEARNING_ENROLLMENT', onField: 'enrollment_id' },
      LEARNING_PROGRAM_MILESTONE: { targetEntity: 'LEARNING_PROGRAM_MILESTONE', onField: 'source_milestone_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  LEARNING_ACTIVITY: {
    logicalSource: 'LEARNING_ACTIVITY',
    physicalTable: 'learning_activities',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'enrollment_milestone_id', 'source_activity_id', 'title', 'activity_type', 'sequence', 'status', 'started_at', 'completed_at', 'created_at', 'updated_at'],
    allowedDimensions: ['enrollment_milestone_id', 'source_activity_id', 'activity_type', 'sequence', 'status', 'started_at', 'completed_at'],
    allowedRelationships: {
      ENROLLMENT_MILESTONE: { targetEntity: 'ENROLLMENT_MILESTONE', onField: 'enrollment_milestone_id' },
      LEARNING_ACTIVITY_DEFINITION: { targetEntity: 'LEARNING_ACTIVITY_DEFINITION', onField: 'source_activity_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  LEARNING_ACTIVITY_REFERENCE: {
    logicalSource: 'LEARNING_ACTIVITY_REFERENCE',
    physicalTable: 'learning_activity_references',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'learning_activity_id', 'reference_type', 'reference_id', 'created_at'],
    allowedDimensions: ['learning_activity_id', 'reference_type', 'reference_id'],
    allowedRelationships: {
      LEARNING_ACTIVITY: { targetEntity: 'LEARNING_ACTIVITY', onField: 'learning_activity_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  LEARNING_REVIEW: {
    logicalSource: 'LEARNING_REVIEW',
    physicalTable: 'learning_reviews',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'enrollment_id', 'reviewer_person_id', 'review_type', 'reviewed_at', 'summary', 'feedback', 'progress_value', 'created_at', 'updated_at'],
    allowedDimensions: ['enrollment_id', 'reviewer_person_id', 'review_type', 'reviewed_at', 'progress_value'],
    allowedRelationships: {
      LEARNING_ENROLLMENT: { targetEntity: 'LEARNING_ENROLLMENT', onField: 'enrollment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'reviewer_person_id' },
    },
    allowedAggregations: ['COUNT', 'AVERAGE', 'TREND'],
  },
  LEARNING_REVIEW_CHANGE: {
    logicalSource: 'LEARNING_REVIEW_CHANGE',
    physicalTable: 'learning_review_changes',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'review_id', 'change_type', 'target_type', 'target_id', 'created_at'],
    allowedDimensions: ['review_id', 'change_type', 'target_type', 'target_id'],
    allowedRelationships: {
      LEARNING_REVIEW: { targetEntity: 'LEARNING_REVIEW', onField: 'review_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  LEARNING_ASSESSMENT: {
    logicalSource: 'LEARNING_ASSESSMENT',
    physicalTable: 'learning_assessments',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'enrollment_id', 'learning_activity_id', 'title', 'description', 'assessment_type', 'status', 'max_score', 'created_at', 'updated_at'],
    allowedDimensions: ['enrollment_id', 'learning_activity_id', 'assessment_type', 'status', 'max_score'],
    allowedRelationships: {
      LEARNING_ENROLLMENT: { targetEntity: 'LEARNING_ENROLLMENT', onField: 'enrollment_id' },
      LEARNING_ACTIVITY: { targetEntity: 'LEARNING_ACTIVITY', onField: 'learning_activity_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  LEARNING_ASSESSMENT_ATTEMPT: {
    logicalSource: 'LEARNING_ASSESSMENT_ATTEMPT',
    physicalTable: 'learning_assessment_attempts',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'assessment_id', 'person_id', 'attempt_number', 'status', 'score', 'submitted_at', 'completed_at', 'created_at', 'updated_at'],
    allowedDimensions: ['assessment_id', 'person_id', 'attempt_number', 'status', 'score', 'submitted_at', 'completed_at'],
    allowedRelationships: {
      LEARNING_ASSESSMENT: { targetEntity: 'LEARNING_ASSESSMENT', onField: 'assessment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'AVERAGE', 'TREND'],
  },
  EVALUATION_TEMPLATE: {
    logicalSource: 'EVALUATION_TEMPLATE',
    physicalTable: 'evaluation_templates',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'description', 'version', 'is_active', 'created_at', 'updated_at'],
    allowedDimensions: ['name', 'version', 'is_active'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  EVALUATION_CRITERION: {
    logicalSource: 'EVALUATION_CRITERION',
    physicalTable: 'evaluation_criteria',
    primaryKey: 'id',
    tenantColumn: null,
    parentJoin: {
      targetEntity: 'EVALUATION_TEMPLATE',
      onField: 'template_id',
      foreignField: 'id',
    },
    allowedFields: ['id', 'template_id', 'order', 'name', 'description', 'weight', 'criterion_type', 'created_at'],
    allowedDimensions: ['template_id', 'order', 'name', 'weight', 'criterion_type'],
    allowedRelationships: {
      EVALUATION_TEMPLATE: { targetEntity: 'EVALUATION_TEMPLATE', onField: 'template_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  EVALUATION: {
    logicalSource: 'EVALUATION',
    physicalTable: 'evaluations',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'template_id', 'subject_id', 'state', 'scheduled_at', 'started_at', 'submitted_at', 'completed_at', 'cancelled_at', 'created_at', 'updated_at'],
    allowedDimensions: ['template_id', 'subject_id', 'state', 'scheduled_at', 'started_at', 'submitted_at', 'completed_at', 'cancelled_at', 'created_at'],
    allowedRelationships: {
      EVALUATION_TEMPLATE: { targetEntity: 'EVALUATION_TEMPLATE', onField: 'template_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'subject_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  EVALUATION_EVALUATOR: {
    logicalSource: 'EVALUATION_EVALUATOR',
    physicalTable: 'evaluation_evaluators',
    primaryKey: ['evaluation_id', 'evaluator_id'],
    tenantColumn: null,
    parentJoin: {
      targetEntity: 'EVALUATION',
      onField: 'evaluation_id',
      foreignField: 'id',
    },
    allowedFields: ['evaluation_id', 'evaluator_id'],
    allowedDimensions: ['evaluation_id', 'evaluator_id'],
    allowedRelationships: {
      EVALUATION: { targetEntity: 'EVALUATION', onField: 'evaluation_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'evaluator_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  CRITERION_RESULT: {
    logicalSource: 'CRITERION_RESULT',
    physicalTable: 'criterion_results',
    primaryKey: 'id',
    tenantColumn: null,
    parentJoin: {
      targetEntity: 'EVALUATION',
      onField: 'evaluation_id',
      foreignField: 'id',
    },
    allowedFields: ['id', 'evaluation_id', 'criterion_id', 'value', 'comments', 'created_at'],
    allowedDimensions: ['evaluation_id', 'criterion_id', 'value', 'created_at'],
    allowedRelationships: {
      EVALUATION: { targetEntity: 'EVALUATION', onField: 'evaluation_id' },
      EVALUATION_CRITERION: { targetEntity: 'EVALUATION_CRITERION', onField: 'criterion_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  EVALUATION_FEEDBACK: {
    logicalSource: 'EVALUATION_FEEDBACK',
    physicalTable: 'evaluation_feedback',
    primaryKey: 'id',
    tenantColumn: null,
    parentJoin: {
      targetEntity: 'EVALUATION',
      onField: 'evaluation_id',
      foreignField: 'id',
    },
    allowedFields: ['id', 'evaluation_id', 'feedback_type', 'payload', 'created_at'],
    allowedDimensions: ['evaluation_id', 'feedback_type', 'created_at'],
    allowedRelationships: {
      EVALUATION: { targetEntity: 'EVALUATION', onField: 'evaluation_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  EVALUATION_OUTCOME: {
    logicalSource: 'EVALUATION_OUTCOME',
    physicalTable: 'evaluation_outcomes',
    primaryKey: 'id',
    tenantColumn: null,
    parentJoin: {
      targetEntity: 'EVALUATION',
      onField: 'evaluation_id',
      foreignField: 'id',
    },
    allowedFields: ['id', 'evaluation_id', 'outcome_key', 'outcome_value', 'created_at'],
    allowedDimensions: ['evaluation_id', 'outcome_key', 'outcome_value', 'created_at'],
    allowedRelationships: {
      EVALUATION: { targetEntity: 'EVALUATION', onField: 'evaluation_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  EVALUATION_HISTORY: {
    logicalSource: 'EVALUATION_HISTORY',
    physicalTable: 'evaluation_history',
    primaryKey: 'id',
    tenantColumn: null,
    parentJoin: {
      targetEntity: 'EVALUATION',
      onField: 'evaluation_id',
      foreignField: 'id',
    },
    allowedFields: ['id', 'evaluation_id', 'snapshot', 'captured_at'],
    allowedDimensions: ['evaluation_id', 'captured_at'],
    allowedRelationships: {
      EVALUATION: { targetEntity: 'EVALUATION', onField: 'evaluation_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  FINANCE_CATEGORY: {
    logicalSource: 'FINANCE_CATEGORY',
    physicalTable: 'finance_categories',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'code', 'category_type', 'description', 'is_active', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'category_type', 'is_active'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  FINANCIAL_PARTY: {
    logicalSource: 'FINANCIAL_PARTY',
    physicalTable: 'financial_parties',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'party_type', 'person_id', 'name', 'email', 'phone', 'tax_identifier', 'created_at', 'updated_at'],
    allowedDimensions: ['party_type', 'person_id', 'name', 'email', 'tax_identifier'],
    allowedRelationships: {
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  FINANCIAL_OBLIGATION: {
    logicalSource: 'FINANCIAL_OBLIGATION',
    physicalTable: 'financial_obligations',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'party_id', 'category_id', 'direction', 'title', 'currency', 'gross_amount', 'discount_amount', 'fee_amount', 'net_amount', 'balance_amount', 'state', 'issue_at', 'due_at', 'paid_at', 'cancelled_at', 'branch_id', 'business_unit_id', 'department_id', 'project_id', 'created_at', 'updated_at'],
    allowedDimensions: ['party_id', 'category_id', 'direction', 'currency', 'gross_amount', 'discount_amount', 'fee_amount', 'net_amount', 'balance_amount', 'state', 'issue_at', 'due_at', 'paid_at', 'cancelled_at', 'branch_id', 'business_unit_id', 'department_id', 'project_id'],
    allowedRelationships: {
      FINANCIAL_PARTY: { targetEntity: 'FINANCIAL_PARTY', onField: 'party_id' },
      FINANCE_CATEGORY: { targetEntity: 'FINANCE_CATEGORY', onField: 'category_id' },
      BRANCH: { targetEntity: 'BRANCH', onField: 'branch_id' },
      BUSINESS_UNIT: { targetEntity: 'BUSINESS_UNIT', onField: 'business_unit_id' },
      DEPARTMENT: { targetEntity: 'DEPARTMENT', onField: 'department_id' },
      PROJECT: { targetEntity: 'PROJECT', onField: 'project_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  FINANCIAL_OBLIGATION_ITEM: {
    logicalSource: 'FINANCIAL_OBLIGATION_ITEM',
    physicalTable: 'financial_obligation_items',
    primaryKey: 'id',
    tenantColumn: null,
    parentJoin: {
      targetEntity: 'FINANCIAL_OBLIGATION',
      onField: 'obligation_id',
      foreignField: 'id',
    },
    allowedFields: ['id', 'obligation_id', 'title', 'item_type', 'unit_amount', 'quantity', 'total_amount', 'created_at'],
    allowedDimensions: ['obligation_id', 'item_type', 'unit_amount', 'quantity', 'total_amount'],
    allowedRelationships: {
      FINANCIAL_OBLIGATION: { targetEntity: 'FINANCIAL_OBLIGATION', onField: 'obligation_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  FINANCIAL_TRANSACTION: {
    logicalSource: 'FINANCIAL_TRANSACTION',
    physicalTable: 'financial_transactions',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'party_id', 'direction', 'transaction_type', 'state', 'amount', 'unallocated_amount', 'currency', 'payment_mode', 'reference_number', 'posted_at', 'reversed_at', 'created_at', 'updated_at'],
    allowedDimensions: ['party_id', 'direction', 'transaction_type', 'state', 'amount', 'unallocated_amount', 'currency', 'payment_mode', 'reference_number', 'posted_at', 'reversed_at', 'created_at'],
    allowedRelationships: {
      FINANCIAL_PARTY: { targetEntity: 'FINANCIAL_PARTY', onField: 'party_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  FINANCIAL_ALLOCATION: {
    logicalSource: 'FINANCIAL_ALLOCATION',
    physicalTable: 'financial_allocations',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'transaction_id', 'obligation_id', 'obligation_item_id', 'allocated_amount', 'created_at'],
    allowedDimensions: ['transaction_id', 'obligation_id', 'obligation_item_id', 'allocated_amount'],
    allowedRelationships: {
      FINANCIAL_TRANSACTION: { targetEntity: 'FINANCIAL_TRANSACTION', onField: 'transaction_id' },
      FINANCIAL_OBLIGATION: { targetEntity: 'FINANCIAL_OBLIGATION', onField: 'obligation_id' },
      FINANCIAL_OBLIGATION_ITEM: { targetEntity: 'FINANCIAL_OBLIGATION_ITEM', onField: 'obligation_item_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  FINANCIAL_ADJUSTMENT: {
    logicalSource: 'FINANCIAL_ADJUSTMENT',
    physicalTable: 'financial_adjustments',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'obligation_id', 'adjustment_type', 'amount', 'reason', 'created_by_person_id', 'created_at'],
    allowedDimensions: ['obligation_id', 'adjustment_type', 'amount', 'created_by_person_id'],
    allowedRelationships: {
      FINANCIAL_OBLIGATION: { targetEntity: 'FINANCIAL_OBLIGATION', onField: 'obligation_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'created_by_person_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  FINANCIAL_BUDGET: {
    logicalSource: 'FINANCIAL_BUDGET',
    physicalTable: 'financial_budgets',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'business_unit_id', 'department_id', 'project_id', 'category_id', 'period_name', 'budget_amount', 'allocated_amount', 'spent_amount', 'period_start', 'period_end', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['business_unit_id', 'department_id', 'project_id', 'category_id', 'period_name', 'budget_amount', 'allocated_amount', 'spent_amount', 'period_start', 'period_end', 'status'],
    allowedRelationships: {
      BUSINESS_UNIT: { targetEntity: 'BUSINESS_UNIT', onField: 'business_unit_id' },
      DEPARTMENT: { targetEntity: 'DEPARTMENT', onField: 'department_id' },
      PROJECT: { targetEntity: 'PROJECT', onField: 'project_id' },
      FINANCE_CATEGORY: { targetEntity: 'FINANCE_CATEGORY', onField: 'category_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  EVENT_OUTBOX: {
    logicalSource: 'EVENT_OUTBOX',
    physicalTable: 'event_outbox',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'event_name', 'event_version', 'entity_type', 'entity_id', 'status', 'retry_count', 'scheduled_at', 'dispatched_at', 'created_at'],
    allowedDimensions: ['event_name', 'event_version', 'entity_type', 'status', 'retry_count', 'scheduled_at', 'dispatched_at', 'created_at'],
    allowedRelationships: {
      USER: { targetEntity: 'USER', onField: 'actor_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'actor_person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  EVENT_CONSUMER_RECORD: {
    logicalSource: 'EVENT_CONSUMER_RECORD',
    physicalTable: 'event_consumer_records',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'event_id', 'consumer_name', 'status', 'processed_at', 'created_at'],
    allowedDimensions: ['event_id', 'consumer_name', 'status', 'processed_at'],
    allowedRelationships: {
      EVENT_OUTBOX: { targetEntity: 'EVENT_OUTBOX', onField: 'event_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  EVENT_REGISTRY: {
    logicalSource: 'EVENT_REGISTRY',
    physicalTable: 'event_registry',
    primaryKey: 'id',
    tenantColumn: null, // Global Registry
    allowedFields: ['id', 'event_name', 'version', 'source_module', 'description', 'is_active', 'created_at', 'updated_at'],
    allowedDimensions: ['event_name', 'version', 'source_module', 'is_active', 'created_at'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORKFORCE_ONBOARDING_TEMPLATE: {
    logicalSource: 'WORKFORCE_ONBOARDING_TEMPLATE',
    physicalTable: 'workforce_onboarding_templates',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'name', 'code', 'description', 'is_default', 'is_active', 'created_at', 'updated_at'],
    allowedDimensions: ['code', 'name', 'is_default', 'is_active'],
    allowedRelationships: {},
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORKFORCE_ONBOARDING_PLAN: {
    logicalSource: 'WORKFORCE_ONBOARDING_PLAN',
    physicalTable: 'workforce_onboarding_plans',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'employment_id', 'person_id', 'template_id', 'status', 'initiated_at', 'target_completion_date', 'actual_completion_date', 'created_at', 'updated_at'],
    allowedDimensions: ['employment_id', 'person_id', 'template_id', 'status', 'initiated_at', 'target_completion_date', 'actual_completion_date', 'created_at'],
    allowedRelationships: {
      EMPLOYMENT: { targetEntity: 'EMPLOYMENT', onField: 'employment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
      WORKFORCE_ONBOARDING_TEMPLATE: { targetEntity: 'WORKFORCE_ONBOARDING_TEMPLATE', onField: 'template_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORKFORCE_ONBOARDING_TASK: {
    logicalSource: 'WORKFORCE_ONBOARDING_TASK',
    physicalTable: 'workforce_onboarding_tasks',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'plan_id', 'template_task_id', 'title', 'description', 'assigned_role_context', 'status', 'is_mandatory', 'display_order', 'due_date', 'completed_at', 'created_at', 'updated_at'],
    allowedDimensions: ['plan_id', 'template_task_id', 'assigned_role_context', 'status', 'is_mandatory', 'due_date', 'completed_at'],
    allowedRelationships: {
      WORKFORCE_ONBOARDING_PLAN: { targetEntity: 'WORKFORCE_ONBOARDING_PLAN', onField: 'plan_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORKFORCE_ONBOARDING_ITEM: {
    logicalSource: 'WORKFORCE_ONBOARDING_ITEM',
    physicalTable: 'workforce_onboarding_items',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'plan_id', 'task_id', 'template_item_id', 'item_type', 'title', 'status', 'verified_by_person_id', 'verified_at', 'created_at', 'updated_at'],
    allowedDimensions: ['plan_id', 'task_id', 'template_item_id', 'item_type', 'status', 'verified_by_person_id', 'verified_at'],
    allowedRelationships: {
      WORKFORCE_ONBOARDING_PLAN: { targetEntity: 'WORKFORCE_ONBOARDING_PLAN', onField: 'plan_id' },
      WORKFORCE_ONBOARDING_TASK: { targetEntity: 'WORKFORCE_ONBOARDING_TASK', onField: 'task_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'verified_by_person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORKFORCE_TRANSFER: {
    logicalSource: 'WORKFORCE_TRANSFER',
    physicalTable: 'workforce_transfers',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'employment_id', 'person_id', 'source_business_unit_id', 'target_business_unit_id', 'source_department_id', 'target_department_id', 'source_team_id', 'target_team_id', 'source_manager_id', 'target_manager_id', 'status', 'effective_date', 'submitted_at', 'reviewed_at', 'approved_at', 'executed_at', 'created_at', 'updated_at'],
    allowedDimensions: ['employment_id', 'person_id', 'status', 'effective_date', 'submitted_at', 'reviewed_at', 'approved_at', 'executed_at'],
    allowedRelationships: {
      EMPLOYMENT: { targetEntity: 'EMPLOYMENT', onField: 'employment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORKFORCE_PROMOTION: {
    logicalSource: 'WORKFORCE_PROMOTION',
    physicalTable: 'workforce_promotions',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'employment_id', 'person_id', 'source_job_title', 'target_job_title', 'source_person_role_id', 'target_person_role_id', 'status', 'effective_date', 'submitted_at', 'reviewed_at', 'approved_at', 'executed_at', 'created_at', 'updated_at'],
    allowedDimensions: ['employment_id', 'person_id', 'source_job_title', 'target_job_title', 'status', 'effective_date', 'submitted_at', 'reviewed_at', 'approved_at', 'executed_at'],
    allowedRelationships: {
      EMPLOYMENT: { targetEntity: 'EMPLOYMENT', onField: 'employment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORKFORCE_OFFBOARDING: {
    logicalSource: 'WORKFORCE_OFFBOARDING',
    physicalTable: 'workforce_offboardings',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'employment_id', 'person_id', 'exit_reason', 'status', 'exit_date', 'completed_at', 'created_at', 'updated_at'],
    allowedDimensions: ['employment_id', 'person_id', 'exit_reason', 'status', 'exit_date', 'completed_at'],
    allowedRelationships: {
      EMPLOYMENT: { targetEntity: 'EMPLOYMENT', onField: 'employment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORKFORCE_OFFBOARDING_CLEARANCE: {
    logicalSource: 'WORKFORCE_OFFBOARDING_CLEARANCE',
    physicalTable: 'workforce_offboarding_clearances',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'offboarding_id', 'clearance_type', 'department_id', 'verifier_person_id', 'financial_obligation_id', 'status', 'cleared_at', 'created_at', 'updated_at'],
    allowedDimensions: ['offboarding_id', 'clearance_type', 'department_id', 'verifier_person_id', 'financial_obligation_id', 'status', 'cleared_at'],
    allowedRelationships: {
      WORKFORCE_OFFBOARDING: { targetEntity: 'WORKFORCE_OFFBOARDING', onField: 'offboarding_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'verifier_person_id' },
      FINANCIAL_OBLIGATION: { targetEntity: 'FINANCIAL_OBLIGATION', onField: 'financial_obligation_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORKFORCE_SCHEDULE: {
    logicalSource: 'WORKFORCE_SCHEDULE',
    physicalTable: 'workforce_schedules',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'branch_id', 'name', 'code', 'description', 'schedule_type', 'timezone', 'expected_weekly_hours', 'is_default', 'is_active', 'created_at', 'updated_at'],
    allowedDimensions: ['branch_id', 'name', 'code', 'schedule_type', 'timezone', 'is_default', 'is_active'],
    allowedRelationships: {
      BRANCH: { targetEntity: 'BRANCH', onField: 'branch_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
  WORKFORCE_ATTENDANCE: {
    logicalSource: 'WORKFORCE_ATTENDANCE',
    physicalTable: 'attendance_records',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'employment_id', 'person_id', 'attendance_date', 'status', 'total_presence_minutes', 'total_break_minutes', 'total_work_minutes', 'is_punctual', 'has_missing_checkout', 'has_correction', 'created_at', 'updated_at'],
    allowedDimensions: ['employment_id', 'person_id', 'attendance_date', 'status', 'is_punctual', 'has_missing_checkout', 'has_correction'],
    allowedRelationships: {
      EMPLOYMENT: { targetEntity: 'EMPLOYMENT', onField: 'employment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  WORKFORCE_TIME_RECORD: {
    logicalSource: 'WORKFORCE_TIME_RECORD',
    physicalTable: 'workforce_time_records',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'employment_id', 'person_id', 'attendance_record_id', 'attendance_session_id', 'time_type', 'started_at', 'ended_at', 'duration_minutes', 'is_overtime', 'overtime_status', 'created_at', 'updated_at'],
    allowedDimensions: ['employment_id', 'person_id', 'attendance_record_id', 'time_type', 'is_overtime', 'overtime_status'],
    allowedRelationships: {
      EMPLOYMENT: { targetEntity: 'EMPLOYMENT', onField: 'employment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
      WORKFORCE_ATTENDANCE: { targetEntity: 'WORKFORCE_ATTENDANCE', onField: 'attendance_record_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  WORKFORCE_TIMESHEET: {
    logicalSource: 'WORKFORCE_TIMESHEET',
    physicalTable: 'workforce_timesheets',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'employment_id', 'person_id', 'period_start_date', 'period_end_date', 'status', 'total_regular_hours', 'total_break_hours', 'total_overtime_hours', 'total_billable_hours', 'submitted_at', 'approved_at', 'created_at', 'updated_at'],
    allowedDimensions: ['employment_id', 'person_id', 'period_start_date', 'period_end_date', 'status'],
    allowedRelationships: {
      EMPLOYMENT: { targetEntity: 'EMPLOYMENT', onField: 'employment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  WORKFORCE_LEAVE_REQUEST: {
    logicalSource: 'WORKFORCE_LEAVE_REQUEST',
    physicalTable: 'leave_requests',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'employment_id', 'person_id', 'leave_type_id', 'start_date', 'end_date', 'is_half_day', 'total_days', 'status', 'created_at', 'updated_at'],
    allowedDimensions: ['employment_id', 'person_id', 'leave_type_id', 'start_date', 'end_date', 'status'],
    allowedRelationships: {
      EMPLOYMENT: { targetEntity: 'EMPLOYMENT', onField: 'employment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  WORKFORCE_LEAVE_BALANCE: {
    logicalSource: 'WORKFORCE_LEAVE_BALANCE',
    physicalTable: 'leave_balances',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'employment_id', 'person_id', 'leave_type_id', 'year', 'opening_balance', 'accrued_balance', 'adjusted_balance', 'used_balance', 'reserved_balance', 'available_balance', 'created_at', 'updated_at'],
    allowedDimensions: ['employment_id', 'person_id', 'leave_type_id', 'year'],
    allowedRelationships: {
      EMPLOYMENT: { targetEntity: 'EMPLOYMENT', onField: 'employment_id' },
      PERSON: { targetEntity: 'PERSON', onField: 'person_id' },
    },
    allowedAggregations: ['COUNT', 'SUM', 'AVERAGE', 'TREND'],
  },
  WORKFORCE_HOLIDAY: {
    logicalSource: 'WORKFORCE_HOLIDAY',
    physicalTable: 'workforce_holidays',
    primaryKey: 'id',
    tenantColumn: 'organization_id',
    allowedFields: ['id', 'organization_id', 'branch_id', 'holiday_date', 'name', 'holiday_type', 'is_half_day', 'is_optional', 'created_at', 'updated_at'],
    allowedDimensions: ['branch_id', 'holiday_date', 'holiday_type', 'is_half_day', 'is_optional'],
    allowedRelationships: {
      BRANCH: { targetEntity: 'BRANCH', onField: 'branch_id' },
    },
    allowedAggregations: ['COUNT', 'TREND'],
  },
};

export class AnalyticsSourceRegistryService {
  public static getLogicalSource(identifier: string): LogicalSourceDefinition {
    const def = ANALYTICS_SOURCE_REGISTRY[identifier.toUpperCase()];
    if (!def) {
      throw new ValidationError(`Unrecognized logical source entity: '${identifier}'`);
    }
    return def;
  }

  public static hasLogicalSource(identifier: string): boolean {
    return Boolean(ANALYTICS_SOURCE_REGISTRY[identifier.toUpperCase()]);
  }

  public static listRegisteredSources(includeAll = false): string[] {
    const keys = Object.keys(ANALYTICS_SOURCE_REGISTRY);
    if (!includeAll) {
      return keys.filter((k) => !k.startsWith('WORKFORCE_'));
    }
    return keys;
  }

  public static validateMetricSpec(spec: CalculationSpec): void {
    if (!spec) {
      throw new ValidationError('Calculation specification must be defined');
    }

    if (spec.numerator && spec.denominator) {
      // Ratio / percentage / rate metric
      this.validateSingleSpec(spec.numerator);
      this.validateSingleSpec(spec.denominator);
      return;
    }

    if (!spec.sourceEntity) {
      throw new ValidationError('Calculation specification must include a sourceEntity or numerator/denominator specifications');
    }

    this.validateSingleSpec({
      sourceEntity: spec.sourceEntity,
      targetColumn: spec.targetColumn,
      filter: spec.filter,
      join: spec.join,
    });
  }

  private static validateSingleSpec(spec: {
    sourceEntity: string;
    targetColumn?: string;
    filter?: Record<string, unknown>;
    join?: { targetEntity: string; onField: string };
  }): void {
    const source = this.getLogicalSource(spec.sourceEntity);

    if (spec.targetColumn) {
      const allowed = source.allowedFields.includes(spec.targetColumn);
      if (!allowed) {
        throw new ValidationError(
          `Target column '${spec.targetColumn}' is not permitted for source entity '${spec.sourceEntity}'`
        );
      }
    }

    if (spec.filter) {
      for (const field of Object.keys(spec.filter)) {
        // Strip table prefix if present (e.g. 'evaluations.state' or 'state')
        const colName = field.includes('.') ? field.split('.')[1] : field;
        const isFieldAllowed =
          source.allowedFields.includes(colName) ||
          source.allowedDimensions.includes(colName);
        if (!isFieldAllowed) {
          // If joined entity is specified, check join entity fields
          if (spec.join) {
            const joinSource = this.getLogicalSource(spec.join.targetEntity);
            if (joinSource.allowedFields.includes(colName) || joinSource.allowedDimensions.includes(colName)) {
              continue;
            }
          }
          throw new ValidationError(
            `Filter field '${field}' is not permitted for source entity '${spec.sourceEntity}'`
          );
        }
      }
    }

    if (spec.join) {
      const joinTarget = this.getLogicalSource(spec.join.targetEntity);
      const rel = source.allowedRelationships[joinTarget.logicalSource];
      if (!rel) {
        throw new ValidationError(
          `Relationship between '${spec.sourceEntity}' and '${spec.join.targetEntity}' is not permitted in source registry`
        );
      }
    }
  }
}
