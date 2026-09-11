import { OrganizationService } from '../modules/organization/application/organization.service.js';
import { StructureService } from '../modules/organization/application/structure.service.js';
import { OrganizationRepository } from '../modules/organization/infrastructure/organization.repository.js';
import { PeopleService } from '../modules/people/application/people.service.js';
import { EmploymentService } from '../modules/people/application/employment.service.js';
import { SkillService } from '../modules/people/application/skill.service.js';
import { runMigrations, closeDb } from '../database/index.js';
import { logger } from '../shared/logging/logger.js';
import { registerProjectTaskTargetResolvers } from '../modules/projects-tasks/infrastructure/target-resolver.js';

export const seedDevelopmentData = async (): Promise<void> => {
  logger.info('🌱 Seeding development database...');
  registerProjectTaskTargetResolvers();

  const devSlug = 'devoc-demo';
  const existingOrg = await OrganizationRepository.findBySlug(devSlug);

  if (existingOrg) {
    logger.info('Demo organization already exists. Skipping seed.');
    return;
  }

  const { organization, adminUser } = await OrganizationService.bootstrapOrganization({
    name: 'DeVoc Official',
    slug: devSlug,
    adminEmail: 'admin@devoc.internal',
    adminPassword: 'DevocAdminPassword123!',
    adminFullName: 'DeVoc Platform Administrator',
  });

  logger.info(`Created Organization: ${organization.name} (${organization.id})`);
  logger.info(`Created Admin User: ${adminUser.email}`);

  // Create default Branch
  const branch = await StructureService.createBranch(organization.id, {
    name: 'Headquarters Branch',
    code: 'HQ-MAIN',
  });

  // Create default Business Units
  const buAcademy = await StructureService.createBusinessUnit(organization.id, {
    name: 'DeVoc Academy',
    code: 'BU-ACADEMY',
  });
  const buSolutions = await StructureService.createBusinessUnit(organization.id, {
    name: 'IT Solutions',
    code: 'BU-SOLUTIONS',
  });

  // Create default Department
  const deptEngineering = await StructureService.createDepartment(organization.id, {
    name: 'Engineering & Software',
    code: 'DEPT-ENG',
  });

  // Create default Team
  const teamCore = await StructureService.createTeam(organization.id, {
    name: 'Core Platform Team',
    code: 'TEAM-CORE',
    departmentId: deptEngineering.id,
    businessUnitId: buSolutions.id,
    isTemporary: false,
  });

  logger.info('Created Organization structure (Branch, BUs, Department, Team).');

  // --- Seed M2 People Engine Data ---
  // Default Roles
  const roleFounder = await PeopleService.createRole(organization.id, {
    name: 'Founder',
    code: 'ROLE-FOUNDER',
    description: 'Executive founder role',
    isSystem: true,
  });
  const roleEmployee = await PeopleService.createRole(organization.id, {
    name: 'Employee',
    code: 'ROLE-EMPLOYEE',
    description: 'Standard employee role',
    isSystem: true,
  });
  const roleMentor = await PeopleService.createRole(organization.id, {
    name: 'Mentor',
    code: 'ROLE-MENTOR',
    description: 'Academy mentor role',
    isSystem: true,
  });
  const roleStudent = await PeopleService.createRole(organization.id, {
    name: 'Student',
    code: 'ROLE-STUDENT',
    description: 'Academy student role',
    isSystem: true,
  });

  logger.info(`Created Roles: ${roleFounder.name}, ${roleEmployee.name}, ${roleMentor.name}, ${roleStudent.name}`);

  // Default Skills
  const skillTs = await SkillService.createSkill(organization.id, {
    name: 'TypeScript',
    code: 'SKILL-TS',
    category: 'Engineering',
  });
  const skillPg = await SkillService.createSkill(organization.id, {
    name: 'PostgreSQL',
    code: 'SKILL-PG',
    category: 'Engineering',
  });

  logger.info(`Created Skills: ${skillTs.name}, ${skillPg.name}`);

  // Example People
  const founderPerson = await PeopleService.createPerson(organization.id, {
    firstName: 'Founder',
    lastName: 'Admin',
    email: 'founder@devoc.internal',
    userId: adminUser.id,
  });

  const leadPerson = await PeopleService.createPerson(organization.id, {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@devoc.internal',
  });

  logger.info(`Created People: ${founderPerson.firstName} ${founderPerson.lastName}, ${leadPerson.firstName} ${leadPerson.lastName}`);

  // Role Assignments
  await PeopleService.assignRoleToPerson(organization.id, founderPerson.id, {
    roleId: roleFounder.id,
  });
  await PeopleService.assignRoleToPerson(organization.id, leadPerson.id, {
    roleId: roleEmployee.id,
    businessUnitId: buSolutions.id,
    departmentId: deptEngineering.id,
    teamId: teamCore.id,
  });

  // Employments
  const founderEmp = await EmploymentService.createEmployment(organization.id, {
    personId: founderPerson.id,
    employmentType: 'full_time',
    status: 'active',
    jobTitle: 'Chief Executive Officer',
    branchId: branch.id,
  });

  const leadEmp = await EmploymentService.createEmployment(organization.id, {
    personId: leadPerson.id,
    employmentType: 'full_time',
    status: 'active',
    jobTitle: 'Lead Software Architect',
    businessUnitId: buSolutions.id,
    departmentId: deptEngineering.id,
    branchId: branch.id,
    managerId: founderPerson.id,
  });

  // Assign Skill
  await SkillService.assignPersonSkill(organization.id, leadPerson.id, {
    skillId: skillTs.id,
    proficiencyLevel: 'expert',
  });

  // --- Seed M3 Assignment Engine Data ---
  const assignmentService = new (await import('../modules/assignments/application/assignment.service.js')).AssignmentService();
  await assignmentService.createAssignment({
    organizationId: organization.id,
    personId: leadPerson.id,
    targetType: 'team',
    targetId: teamCore.id,
    assignmentType: 'lead',
    roleContext: 'tech_lead',
    status: 'active',
    startAt: new Date('2026-01-01'),
    capacityType: 'allocation',
    capacityValue: 100,
    capacityUnit: 'percentage',
    authorityType: 'org_admin',
    notes: 'Technical Lead for Core Platform Team',
    actorUserId: adminUser.id,
  });

  // --- Seed M4 Projects & Tasks Engine Data ---
  const { ProjectService } = await import('../modules/projects-tasks/application/project.service.js');
  const { TaskService } = await import('../modules/projects-tasks/application/task.service.js');

  const demoProject = await ProjectService.createProject({
    organizationId: organization.id,
    name: 'DeVoc Core Operating System',
    key: 'DEVOC',
    description: 'Enterprise Multi-Tenant Business Operating System Platform',
    projectType: 'saas_product',
    status: 'development',
    priority: 'critical',
    startAt: new Date('2026-01-01'),
    targetEndAt: new Date('2026-12-31'),
    createdByPersonId: founderPerson.id,
    businessUnitIds: [buSolutions.id],
    owners: [
      {
        personId: leadPerson.id,
        ownershipType: 'technical_owner',
      },
      {
        personId: founderPerson.id,
        ownershipType: 'accountable',
      },
    ],
    actorUserId: adminUser.id,
  });

  const demoEpic = await TaskService.createTask({
    organizationId: organization.id,
    projectId: demoProject.id,
    title: 'Core Engine Architecture',
    description: 'Build core domain engines for DeVoc OS',
    taskKey: 'DEVOC-1',
    taskType: 'epic',
    status: 'in_progress',
    priority: 'high',
    createdByPersonId: leadPerson.id,
    actorUserId: adminUser.id,
  });

  const demoTask = await TaskService.createTask({
    organizationId: organization.id,
    projectId: demoProject.id,
    parentTaskId: demoEpic.id,
    title: 'Implement Milestone 4 Projects & Tasks Engine',
    description: 'Projects and Tasks domain entities, persistence, lifecycle, and target resolvers',
    taskKey: 'DEVOC-2',
    taskType: 'task',
    status: 'in_progress',
    priority: 'critical',
    createdByPersonId: leadPerson.id,
    actorUserId: adminUser.id,
  });

  // Sample Assignment targeting the Project
  await assignmentService.createAssignment({
    organizationId: organization.id,
    personId: leadPerson.id,
    targetType: 'project',
    targetId: demoProject.id,
    assignmentType: 'developer',
    roleContext: 'tech_lead',
    status: 'active',
    startAt: new Date('2026-01-01'),
    capacityType: 'allocation',
    capacityValue: 50,
    capacityUnit: 'percentage',
    authorityType: 'org_admin',
    notes: 'Technical Lead for DeVoc Core OS Project',
    actorUserId: adminUser.id,
  });

  // --- Seed M5 Work Engine Data ---
  const { WorkCategoryService } = await import('../modules/work/application/work-category.service.js');
  const { WorkService } = await import('../modules/work/application/work.service.js');

  const defaultCategories = await WorkCategoryService.seedDefaultCategories(organization.id);
  const engCategory = defaultCategories.find((c) => c.code === 'engineering');

  const sampleOutcome = await WorkService.createOutcome({
    organizationId: organization.id,
    title: 'Completed M5 Work Engine Core Architecture',
    description: 'Work records, evidence, outcome linking, and status transitions implemented.',
    outcomeType: 'deliverable',
    createdByPersonId: founderPerson.id,
    actorUserId: adminUser.id,
  });

  const sampleWork = await WorkService.createWorkRecord({
    organizationId: organization.id,
    personId: leadPerson.id,
    title: 'Implement Milestone 5 Work Engine Architecture',
    description: 'Domain model, persistence schema, APIs, target resolvers, evidence, and outcome associations',
    categoryId: engCategory?.id || defaultCategories[0].id,
    targetType: 'project',
    targetId: demoProject.id,
    durationMinutes: 480,
    startedAt: new Date('2026-09-10T09:00:00Z'),
    endedAt: new Date('2026-09-10T17:00:00Z'),
    createdByPersonId: leadPerson.id,
    actorUserId: adminUser.id,
  });

  await WorkService.addEvidence({
    organizationId: organization.id,
    workRecordId: sampleWork.id,
    evidenceType: 'github_pull_request',
    title: 'PR #5: Milestone 5 Work Engine Implementation',
    referenceUri: 'https://github.com/devoc-official/devoc-os/pull/5',
    actorUserId: adminUser.id,
  });

  await WorkService.linkWorkOutcome(organization.id, sampleWork.id, sampleOutcome.id, undefined, undefined, undefined, adminUser.id);

  // --- Seed M6 Meetings Engine Data ---
  const { MeetingTypeService } = await import('../modules/meetings/application/meeting-type.service.js');
  const { MeetingService } = await import('../modules/meetings/application/meeting.service.js');

  const defaultTypes = await MeetingTypeService.seedDefaultMeetingTypes(organization.id);
  const projMeetingType = defaultTypes.find((t) => t.code === 'project');

  const sampleMeeting = await MeetingService.createMeeting({
    organizationId: organization.id,
    title: 'DeVoc OS M6 Meetings Architecture Sync',
    description: 'Weekly architecture alignment meeting for platform components',
    meetingTypeId: projMeetingType?.id || defaultTypes[0].id,
    scheduledStartAt: new Date('2026-09-15T10:00:00Z'),
    scheduledEndAt: new Date('2026-09-15T11:00:00Z'),
    locationType: 'virtual',
    locationReference: 'https://meet.devoc.internal/m6-sync',
    organizerPersonId: founderPerson.id,
    createdByPersonId: founderPerson.id,
    targetType: 'project',
    targetId: demoProject.id,
    actorUserId: adminUser.id,
  });

  await MeetingService.addParticipant(
    organization.id,
    sampleMeeting.id,
    {
      personId: leadPerson.id,
      participantType: 'required',
      responseStatus: 'accepted',
    },
    adminUser.id
  );

  await MeetingService.addAgendaItem(
    organization.id,
    sampleMeeting.id,
    {
      title: 'Review M6 Meetings Engine Schema & APIs',
      description: 'Discuss meeting records, target resolvers, decisions, and action items',
      position: 1,
      ownerPersonId: leadPerson.id,
      durationMinutes: 30,
    },
    adminUser.id
  );

  await MeetingService.upsertDraftNotes(
    organization.id,
    sampleMeeting.id,
    'Discussed Meetings Engine schema, target resolution, and Task linking architecture.',
    founderPerson.id,
    undefined,
    adminUser.id
  );

  await MeetingService.createDecision(
    organization.id,
    sampleMeeting.id,
    {
      title: 'Approved M6 Meetings Engine Architecture',
      decisionText: 'Accepted ADR-010 Meetings Engine design without parallel membership or assignee tables.',
      recordedByPersonId: founderPerson.id,
    },
    adminUser.id
  );

  await MeetingService.createActionItem(
    organization.id,
    sampleMeeting.id,
    {
      title: 'Implement Milestone 6 Meetings Engine Code & Tests',
      description: 'Write repositories, services, controllers, and comprehensive test suite',
      ownerPersonId: leadPerson.id,
      dueAt: new Date('2026-09-20T17:00:00Z'),
      taskId: demoTask.id,
    },
    adminUser.id
  );

  logger.info(`Created Sample Work Record: ${sampleWork.title} (${sampleWork.id})`);
  logger.info(`Created Sample Meeting: ${sampleMeeting.title} (${sampleMeeting.id})`);
  logger.info('Created Employments, Reporting hierarchy, Sample Assignment, M5 Work & M6 Meetings Data.');
  logger.info('✅ Seeding complete!');
};

if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))) {
  (async () => {
    try {
      await seedDevelopmentData();
    } catch (e) {
      logger.error('Seeding failed:', { error: (e as Error).message });
    } finally {
      await closeDb();
    }
  })();
}
