import { Request, Response } from 'express';
import { OrganizationAdminService } from '../application/organization-admin.service.js';
import { SettingsService } from '../application/settings.service.js';
import { StructureService } from '../../organization/application/structure.service.js';
import { MasterDataService } from '../application/master-data.service.js';
import { FeatureConfigService } from '../application/feature-config.service.js';
import { AuditService } from '../../../audit/audit.service.js';
import { sendSuccess, sendError } from '../../../shared/http/envelope.js';
import { ValidationError } from '../../../shared/errors/index.js';

const getParam = (req: Request, name: string): string => {
  const val = req.params[name];
  return (Array.isArray(val) ? val[0] : val) as string;
};

export class OrganizationAdminController {
  // ==========================================
  // 1. ORGANIZATION PROFILE & SETTINGS
  // ==========================================
  public static async getOrganization(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const result = await OrganizationAdminService.getOrganizationProfile(orgId);
      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateOrganization(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { name } = req.body;
      const updated = await OrganizationAdminService.updateOrganizationProfile(
        orgId,
        { name },
        req.user?.id,
        req.requestId,
        req.correlationId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const settings = await SettingsService.getSettings(orgId);
      sendSuccess(res, settings, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const {
        timezone,
        locale,
        dateFormat,
        timeFormat,
        currency,
        defaultBranchId,
        defaultBusinessUnitId,
        settings,
      } = req.body;

      const updated = await SettingsService.updateSettings(orgId, {
        timezone,
        locale,
        dateFormat,
        timeFormat,
        currency,
        defaultBranchId,
        defaultBusinessUnitId,
        settings,
        actorId: req.user?.id,
        requestId: req.requestId,
        correlationId: req.correlationId,
      });

      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================
  // 2. BUSINESS STRUCTURE (M1 Organization)
  // ==========================================
  public static async listBranches(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const branches = await StructureService.listBranches(orgId);
      sendSuccess(res, branches, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createBranch(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { name, code, status } = req.body;
      const branch = await StructureService.createBranch(
        orgId,
        { name, code, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, branch, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateBranch(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const { name, status } = req.body;
      const updated = await StructureService.updateBranch(
        orgId,
        id,
        { name, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listBusinessUnits(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const bus = await StructureService.listBusinessUnits(orgId);
      sendSuccess(res, bus, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createBusinessUnit(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { name, code, status } = req.body;
      const bu = await StructureService.createBusinessUnit(
        orgId,
        { name, code, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, bu, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateBusinessUnit(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const { name, status } = req.body;
      const updated = await StructureService.updateBusinessUnit(
        orgId,
        id,
        { name, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listDepartments(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const depts = await StructureService.listDepartments(orgId);
      sendSuccess(res, depts, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createDepartment(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { name, code, status } = req.body;
      const dept = await StructureService.createDepartment(
        orgId,
        { name, code, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, dept, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateDepartment(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const { name, status } = req.body;
      const updated = await StructureService.updateDepartment(
        orgId,
        id,
        { name, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async listTeams(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const teams = await StructureService.listTeams(orgId);
      sendSuccess(res, teams, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createTeam(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { name, code, departmentId, businessUnitId, isTemporary, status } = req.body;

      if (businessUnitId) {
        await StructureService.getBusinessUnit(orgId, businessUnitId);
      }
      if (departmentId) {
        await StructureService.getDepartment(orgId, departmentId);
      }

      const team = await StructureService.createTeam(
        orgId,
        { name, code, departmentId, businessUnitId, isTemporary, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, team, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateTeam(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const { name, departmentId, businessUnitId, isTemporary, status } = req.body;

      if (businessUnitId) {
        await StructureService.getBusinessUnit(orgId, businessUnitId);
      }
      if (departmentId) {
        await StructureService.getDepartment(orgId, departmentId);
      }

      const updated = await StructureService.updateTeam(
        orgId,
        id,
        { name, departmentId, businessUnitId, isTemporary, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================
  // 3. MEMBERSHIP & INVITATIONS
  // ==========================================
  public static async listMembers(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const members = await OrganizationAdminService.listMembers(orgId);
      sendSuccess(res, members, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async inviteMember(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { email, role } = req.body;
      if (!email) {
        throw new ValidationError("Body parameter 'email' is required");
      }
      const membership = await OrganizationAdminService.inviteMember(
        orgId,
        email,
        role || 'org_member',
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, membership, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const userId = getParam(req, 'userId');
      const { role } = req.body;
      if (!role || (role !== 'org_admin' && role !== 'org_member')) {
        throw new ValidationError("Role must be 'org_admin' or 'org_member'");
      }

      const updated = await OrganizationAdminService.updateMemberRole(
        orgId,
        userId,
        role,
        req.user?.id,
        req.requestId,
        req.correlationId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateMemberStatus(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const userId = getParam(req, 'userId');
      const { status } = req.body;
      if (!status || (status !== 'active' && status !== 'suspended')) {
        throw new ValidationError("Status must be 'active' or 'suspended'");
      }

      const updated = await OrganizationAdminService.updateMemberStatus(
        orgId,
        userId,
        status,
        req.user?.id,
        req.requestId,
        req.correlationId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================
  // 4. PERSON <-> USER & CONTEXTUAL ROLES
  // ==========================================
  public static async linkUserToPerson(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const personId = getParam(req, 'personId');
      const { userId } = req.body;
      if (!userId) {
        throw new ValidationError("Body parameter 'userId' is required");
      }

      const result = await OrganizationAdminService.linkUserToPerson(
        orgId,
        personId,
        userId,
        req.user?.id,
        req.requestId,
        req.correlationId
      );

      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async unlinkUserFromPerson(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const personId = getParam(req, 'personId');

      const result = await OrganizationAdminService.unlinkUserFromPerson(
        orgId,
        personId,
        req.user?.id,
        req.requestId,
        req.correlationId
      );

      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async assignPersonRole(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const personId = getParam(req, 'personId');
      const { roleId, businessUnitId, departmentId, teamId, startDate, endDate } = req.body;

      if (!roleId) {
        throw new ValidationError("Body parameter 'roleId' is required");
      }

      const result = await OrganizationAdminService.assignContextualRole(
        orgId,
        personId,
        {
          roleId,
          businessUnitId,
          departmentId,
          teamId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
        req.user?.id,
        req.requestId,
        req.correlationId
      );

      sendSuccess(res, result, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async endPersonRole(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const personId = getParam(req, 'personId');
      const personRoleId = getParam(req, 'personRoleId');

      const result = await OrganizationAdminService.endContextualRole(
        orgId,
        personId,
        personRoleId,
        req.user?.id,
        req.requestId
      );

      sendSuccess(res, result, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================
  // 5. CONFIGURABLE MASTER DATA
  // ==========================================
  // Work Categories
  public static async listWorkCategories(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const includeInactive = req.query.include_inactive === 'true';
      const categories = await MasterDataService.listWorkCategories(orgId, includeInactive);
      sendSuccess(res, categories, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createWorkCategory(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { name, code, description } = req.body;
      const category = await MasterDataService.createWorkCategory(
        orgId,
        { name, code, description },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, category, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateWorkCategory(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const { name, description, active, isActive } = req.body;
      const activeFlag = active !== undefined ? active : isActive;

      const updated = await MasterDataService.updateWorkCategory(
        orgId,
        id,
        { name, description, active: activeFlag },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async retireWorkCategory(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const retired = await MasterDataService.deleteOrRetireWorkCategory(
        orgId,
        id,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, retired, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // Meeting Types
  public static async listMeetingTypes(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const includeInactive = req.query.include_inactive === 'true';
      const types = await MasterDataService.listMeetingTypes(orgId, includeInactive);
      sendSuccess(res, types, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createMeetingType(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { name, code, description } = req.body;
      const type = await MasterDataService.createMeetingType(
        orgId,
        { name, code, description },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, type, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateMeetingType(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const { name, description, isActive } = req.body;

      const updated = await MasterDataService.updateMeetingType(
        orgId,
        id,
        { name, description, isActive },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async retireMeetingType(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const retired = await MasterDataService.deleteOrRetireMeetingType(
        orgId,
        id,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, retired, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // Evaluation Templates
  public static async listEvaluationTemplates(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const includeInactive = req.query.include_inactive === 'true';
      const templates = await MasterDataService.listEvaluationTemplates(orgId, includeInactive);
      sendSuccess(res, templates, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createEvaluationTemplate(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { name, description, version } = req.body;
      const template = await MasterDataService.createEvaluationTemplate(
        orgId,
        { name, description, version },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, template, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateEvaluationTemplate(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const { name, description, isActive } = req.body;
      const updated = await MasterDataService.updateEvaluationTemplate(
        orgId,
        id,
        { name, description, isActive },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // Finance Categories
  public static async listFinanceCategories(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const includeInactive = req.query.include_inactive === 'true';
      const categories = await MasterDataService.listFinanceCategories(orgId, includeInactive);
      sendSuccess(res, categories, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createFinanceCategory(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { name, code, categoryType, description } = req.body;
      const category = await MasterDataService.createFinanceCategory(
        orgId,
        { name, code, categoryType, description },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, category, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateFinanceCategory(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const { name, description, isActive } = req.body;
      const updated = await MasterDataService.updateFinanceCategory(
        orgId,
        id,
        { name, description, isActive },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async retireFinanceCategory(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const retired = await MasterDataService.deleteOrRetireFinanceCategory(
        orgId,
        id,
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, retired, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // Skills
  public static async listSkills(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const includeInactive = req.query.include_inactive === 'true';
      const skills = await MasterDataService.listSkills(orgId, includeInactive);
      sendSuccess(res, skills, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async createSkill(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const { name, code, category } = req.body;
      const skill = await MasterDataService.createSkill(
        orgId,
        { name, code, category },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, skill, 201, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async updateSkill(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const id = getParam(req, 'id');
      const { name, category, status } = req.body;
      const updated = await MasterDataService.updateSkill(
        orgId,
        id,
        { name, category, status },
        req.user?.id,
        req.requestId
      );
      sendSuccess(res, updated, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================
  // 6. FEATURE CONFIGURATION OVERRIDES
  // ==========================================
  public static async listFeatures(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const features = await FeatureConfigService.resolveFeaturesForOrganization(orgId);
      sendSuccess(res, features, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async getFeature(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const featureKey = getParam(req, 'featureKey');
      const feature = await FeatureConfigService.resolveSingleFeature(orgId, featureKey);
      sendSuccess(res, feature, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async setFeatureOverride(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const featureKey = getParam(req, 'featureKey');
      const { isEnabled, configValue, description } = req.body;
      if (isEnabled === undefined || typeof isEnabled !== 'boolean') {
        throw new ValidationError("Boolean body parameter 'isEnabled' is required");
      }

      const override = await FeatureConfigService.setOrganizationOverride(
        orgId,
        featureKey,
        isEnabled,
        configValue,
        description,
        req.user?.id,
        req.requestId,
        req.correlationId
      );

      sendSuccess(res, override, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  public static async deleteFeatureOverride(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const featureKey = getParam(req, 'featureKey');
      const resolved = await FeatureConfigService.deleteOrganizationOverride(
        orgId,
        featureKey,
        req.user?.id,
        req.requestId,
        req.correlationId
      );
      sendSuccess(res, resolved, 200, { requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }

  // ==========================================
  // 7. ADMINISTRATIVE AUDIT LOGS
  // ==========================================
  public static async listAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.tenantContext!.organizationId;
      const action = req.query.action as string | undefined;
      const actorId = req.query.actorId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const result = await AuditService.listLogsForTenant(
        orgId,
        {
          action,
          actorId,
          startDate,
          endDate,
        },
        limit,
        offset
      );

      sendSuccess(res, result.data, 200, { total: result.total, limit, offset, requestId: req.requestId });
    } catch (err) {
      sendError(res, err as Error, req.requestId);
    }
  }
}
