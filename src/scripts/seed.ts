import { OrganizationService } from '../modules/organization/application/organization.service.js';
import { StructureService } from '../modules/organization/application/structure.service.js';
import { OrganizationRepository } from '../modules/organization/infrastructure/organization.repository.js';
import { PeopleService } from '../modules/people/application/people.service.js';
import { EmploymentService } from '../modules/people/application/employment.service.js';
import { SkillService } from '../modules/people/application/skill.service.js';
import { runMigrations, closeDb } from '../database/index.js';
import { logger } from '../shared/logging/logger.js';

export const seedDevelopmentData = async (): Promise<void> => {
  logger.info('🌱 Seeding development database...');

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

  logger.info('Created Employments & Reporting hierarchy (John Doe reports to Founder Admin).');
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
