import { OrganizationService } from '../modules/organization/application/organization.service.js';
import { StructureService } from '../modules/organization/application/structure.service.js';
import { OrganizationRepository } from '../modules/organization/infrastructure/organization.repository.js';
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
  logger.info(`Created Branch: ${branch.name}`);

  // Create default Business Units
  const buAcademy = await StructureService.createBusinessUnit(organization.id, {
    name: 'DeVoc Academy',
    code: 'BU-ACADEMY',
  });
  const buSolutions = await StructureService.createBusinessUnit(organization.id, {
    name: 'IT Solutions',
    code: 'BU-SOLUTIONS',
  });
  logger.info(`Created BUs: ${buAcademy.name}, ${buSolutions.name}`);

  // Create default Departments
  const deptEngineering = await StructureService.createDepartment(organization.id, {
    name: 'Engineering & Software',
    code: 'DEPT-ENG',
  });
  logger.info(`Created Department: ${deptEngineering.name}`);

  // Create default Teams
  const teamCore = await StructureService.createTeam(organization.id, {
    name: 'Core Platform Team',
    code: 'TEAM-CORE',
    departmentId: deptEngineering.id,
    businessUnitId: buSolutions.id,
    isTemporary: false,
  });
  logger.info(`Created Team: ${teamCore.name}`);

  logger.info('✅ Seeding complete!');
};

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
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
