import { apiClient } from './client';
import { Branch, BusinessUnit, Department, Team, Organization } from './organization.api';

export interface OrganizationSettings {
  organizationId: string;
  timezone?: string;
  locale?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  currency?: string;
  defaultBranchId?: string | null;
  defaultBusinessUnitId?: string | null;
  settings?: Record<string, unknown>;
  defaultCurrency?: string;
  fiscalYearStartMonth?: number;
  timeZone?: string;
  allowSelfRegistration?: boolean;
  updatedAt?: string;
  createdAt?: string;
}

export interface OrganizationProfileResponse {
  organization: Organization;
  settings: OrganizationSettings;
}

export interface OrganizationMember {
  membershipId?: string;
  userId: string;
  email: string;
  fullName: string;
  role: 'org_admin' | 'org_member';
  status: 'active' | 'suspended' | 'invited';
  linkedPerson?: { id: string; firstName: string; lastName: string } | null;
  joinedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeatureConfiguration {
  featureKey: string;
  isEnabled: boolean;
  configurationPayload?: Record<string, any>;
  configValue?: Record<string, any>;
  source?: 'organization_override' | 'platform_default' | 'system_default';
  description?: string;
  updatedAt?: string;
}

export interface AdminAuditLog {
  id: string;
  organizationId?: string | null;
  actorId?: string | null;
  actorUserId?: string | null;
  actorPersonId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  payload?: Record<string, any> | null;
  metadata?: Record<string, any>;
  requestId?: string | null;
  createdAt: string;
}

export interface WorkCategoryItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingTypeItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationTemplateItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  dimensions?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCategoryItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  type?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillItem {
  id: string;
  organizationId: string;
  name: string;
  category?: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const adminApi = {
  // 1. Organization & Settings
  getOrganizationProfile: async (organizationId: string): Promise<OrganizationProfileResponse> => {
    return apiClient.get<OrganizationProfileResponse>('/admin/organization', { organizationId });
  },

  updateOrganizationProfile: async (
    organizationId: string,
    data: { name: string }
  ): Promise<Organization> => {
    return apiClient.patch<Organization>('/admin/organization', data, { organizationId });
  },

  getSettings: async (organizationId: string): Promise<OrganizationSettings> => {
    return apiClient.get<OrganizationSettings>('/admin/settings', { organizationId });
  },

  updateSettings: async (
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<OrganizationSettings> => {
    return apiClient.put<OrganizationSettings>('/admin/settings', settings, { organizationId });
  },

  // 2. Business Structure
  listBranches: async (organizationId: string): Promise<Branch[]> => {
    return apiClient.get<Branch[]>('/admin/branches', { organizationId });
  },

  createBranch: async (
    organizationId: string,
    data: { name: string; code: string; status?: 'active' | 'inactive'; location?: string }
  ): Promise<Branch> => {
    return apiClient.post<Branch>('/admin/branches', data, { organizationId });
  },

  updateBranch: async (
    organizationId: string,
    id: string,
    data: { name?: string; status?: 'active' | 'inactive'; location?: string }
  ): Promise<Branch> => {
    return apiClient.patch<Branch>(`/admin/branches/${id}`, data, { organizationId });
  },

  listBusinessUnits: async (organizationId: string): Promise<BusinessUnit[]> => {
    return apiClient.get<BusinessUnit[]>('/admin/business-units', { organizationId });
  },

  createBusinessUnit: async (
    organizationId: string,
    data: { name: string; code: string; headPersonId?: string | null; status?: 'active' | 'inactive' }
  ): Promise<BusinessUnit> => {
    return apiClient.post<BusinessUnit>('/admin/business-units', data, { organizationId });
  },

  updateBusinessUnit: async (
    organizationId: string,
    id: string,
    data: { name?: string; headPersonId?: string | null; status?: 'active' | 'inactive' }
  ): Promise<BusinessUnit> => {
    return apiClient.patch<BusinessUnit>(`/admin/business-units/${id}`, data, { organizationId });
  },

  listDepartments: async (organizationId: string): Promise<Department[]> => {
    return apiClient.get<Department[]>('/admin/departments', { organizationId });
  },

  createDepartment: async (
    organizationId: string,
    data: { name: string; code: string; businessUnitId?: string | null; status?: 'active' | 'inactive' }
  ): Promise<Department> => {
    return apiClient.post<Department>('/admin/departments', data, { organizationId });
  },

  updateDepartment: async (
    organizationId: string,
    id: string,
    data: { name?: string; businessUnitId?: string | null; status?: 'active' | 'inactive' }
  ): Promise<Department> => {
    return apiClient.patch<Department>(`/admin/departments/${id}`, data, { organizationId });
  },

  listTeams: async (organizationId: string): Promise<Team[]> => {
    return apiClient.get<Team[]>('/admin/teams', { organizationId });
  },

  createTeam: async (
    organizationId: string,
    data: {
      name: string;
      code: string;
      departmentId?: string | null;
      businessUnitId?: string | null;
      status?: 'active' | 'inactive';
      isTemporary?: boolean;
    }
  ): Promise<Team> => {
    return apiClient.post<Team>('/admin/teams', data, { organizationId });
  },

  updateTeam: async (
    organizationId: string,
    id: string,
    data: {
      name?: string;
      departmentId?: string | null;
      businessUnitId?: string | null;
      status?: 'active' | 'inactive';
    }
  ): Promise<Team> => {
    return apiClient.patch<Team>(`/admin/teams/${id}`, data, { organizationId });
  },

  // 3. Members & Access
  listMembers: async (organizationId: string): Promise<OrganizationMember[]> => {
    return apiClient.get<OrganizationMember[]>('/admin/members', { organizationId });
  },

  inviteMember: async (
    organizationId: string,
    data: { email: string; role?: 'org_admin' | 'org_member' }
  ): Promise<any> => {
    return apiClient.post('/admin/invitations', data, { organizationId });
  },

  updateMemberRole: async (
    organizationId: string,
    userId: string,
    role: 'org_admin' | 'org_member'
  ): Promise<any> => {
    return apiClient.patch(`/admin/members/${userId}/role`, { role }, { organizationId });
  },

  updateMemberStatus: async (
    organizationId: string,
    userId: string,
    status: 'active' | 'suspended'
  ): Promise<any> => {
    return apiClient.patch(`/admin/members/${userId}/status`, { status }, { organizationId });
  },

  // 4. Person <-> User Linking & Contextual Roles
  linkUserToPerson: async (
    organizationId: string,
    personId: string,
    userId: string
  ): Promise<{ personId: string; userId: string }> => {
    return apiClient.post(`/admin/people/${personId}/link-user`, { userId }, { organizationId });
  },

  unlinkUserFromPerson: async (
    organizationId: string,
    personId: string
  ): Promise<{ personId: string; previousUserId: string }> => {
    return apiClient.post(`/admin/people/${personId}/unlink-user`, {}, { organizationId });
  },

  assignPersonRole: async (
    organizationId: string,
    personId: string,
    data: {
      roleId: string;
      businessUnitId?: string | null;
      departmentId?: string | null;
      teamId?: string | null;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> => {
    return apiClient.post(`/admin/people/${personId}/roles`, data, { organizationId });
  },

  endPersonRole: async (
    organizationId: string,
    personId: string,
    personRoleId: string
  ): Promise<any> => {
    return apiClient.delete(`/admin/people/${personId}/roles/${personRoleId}`, { organizationId });
  },

  // 5. Configurable Master Data
  listWorkCategories: async (
    organizationId: string,
    includeInactive = true
  ): Promise<WorkCategoryItem[]> => {
    return apiClient.get<WorkCategoryItem[]>('/admin/master-data/work-categories', {
      organizationId,
      params: { include_inactive: includeInactive },
    });
  },

  createWorkCategory: async (
    organizationId: string,
    data: { name: string; code: string; description?: string }
  ): Promise<WorkCategoryItem> => {
    return apiClient.post<WorkCategoryItem>('/admin/master-data/work-categories', data, {
      organizationId,
    });
  },

  updateWorkCategory: async (
    organizationId: string,
    id: string,
    data: { name?: string; description?: string; active?: boolean }
  ): Promise<WorkCategoryItem> => {
    return apiClient.patch<WorkCategoryItem>(`/admin/master-data/work-categories/${id}`, data, {
      organizationId,
    });
  },

  retireWorkCategory: async (organizationId: string, id: string): Promise<any> => {
    return apiClient.delete(`/admin/master-data/work-categories/${id}`, { organizationId });
  },

  listMeetingTypes: async (
    organizationId: string,
    includeInactive = true
  ): Promise<MeetingTypeItem[]> => {
    return apiClient.get<MeetingTypeItem[]>('/admin/master-data/meeting-types', {
      organizationId,
      params: { include_inactive: includeInactive },
    });
  },

  createMeetingType: async (
    organizationId: string,
    data: { name: string; code: string; description?: string }
  ): Promise<MeetingTypeItem> => {
    return apiClient.post<MeetingTypeItem>('/admin/master-data/meeting-types', data, {
      organizationId,
    });
  },

  updateMeetingType: async (
    organizationId: string,
    id: string,
    data: { name?: string; description?: string; active?: boolean }
  ): Promise<MeetingTypeItem> => {
    return apiClient.patch<MeetingTypeItem>(`/admin/master-data/meeting-types/${id}`, data, {
      organizationId,
    });
  },

  retireMeetingType: async (organizationId: string, id: string): Promise<any> => {
    return apiClient.delete(`/admin/master-data/meeting-types/${id}`, { organizationId });
  },

  listEvaluationTemplates: async (organizationId: string): Promise<EvaluationTemplateItem[]> => {
    return apiClient.get<EvaluationTemplateItem[]>('/admin/master-data/evaluation-templates', {
      organizationId,
    });
  },

  createEvaluationTemplate: async (
    organizationId: string,
    data: { name: string; code: string; description?: string }
  ): Promise<EvaluationTemplateItem> => {
    return apiClient.post<EvaluationTemplateItem>('/admin/master-data/evaluation-templates', data, {
      organizationId,
    });
  },

  updateEvaluationTemplate: async (
    organizationId: string,
    id: string,
    data: { name?: string; description?: string }
  ): Promise<EvaluationTemplateItem> => {
    return apiClient.patch<EvaluationTemplateItem>(
      `/admin/master-data/evaluation-templates/${id}`,
      data,
      { organizationId }
    );
  },

  listFinanceCategories: async (
    organizationId: string,
    includeInactive = true
  ): Promise<FinanceCategoryItem[]> => {
    return apiClient.get<FinanceCategoryItem[]>('/admin/master-data/finance-categories', {
      organizationId,
      params: { include_inactive: includeInactive },
    });
  },

  createFinanceCategory: async (
    organizationId: string,
    data: { name: string; code: string; type?: string }
  ): Promise<FinanceCategoryItem> => {
    return apiClient.post<FinanceCategoryItem>('/admin/master-data/finance-categories', data, {
      organizationId,
    });
  },

  updateFinanceCategory: async (
    organizationId: string,
    id: string,
    data: { name?: string; type?: string; active?: boolean }
  ): Promise<FinanceCategoryItem> => {
    return apiClient.patch<FinanceCategoryItem>(
      `/admin/master-data/finance-categories/${id}`,
      data,
      { organizationId }
    );
  },

  retireFinanceCategory: async (organizationId: string, id: string): Promise<any> => {
    return apiClient.delete(`/admin/master-data/finance-categories/${id}`, { organizationId });
  },

  listSkills: async (organizationId: string): Promise<SkillItem[]> => {
    return apiClient.get<SkillItem[]>('/admin/master-data/skills', { organizationId });
  },

  createSkill: async (
    organizationId: string,
    data: { name: string; category?: string; description?: string }
  ): Promise<SkillItem> => {
    return apiClient.post<SkillItem>('/admin/master-data/skills', data, { organizationId });
  },

  updateSkill: async (
    organizationId: string,
    id: string,
    data: { name?: string; category?: string; description?: string }
  ): Promise<SkillItem> => {
    return apiClient.patch<SkillItem>(`/admin/master-data/skills/${id}`, data, { organizationId });
  },

  // 6. Features
  listFeatures: async (organizationId: string): Promise<FeatureConfiguration[]> => {
    return apiClient.get<FeatureConfiguration[]>('/admin/features', { organizationId });
  },

  getFeature: async (organizationId: string, featureKey: string): Promise<FeatureConfiguration> => {
    return apiClient.get<FeatureConfiguration>(`/admin/features/${featureKey}`, { organizationId });
  },

  setFeatureOverride: async (
    organizationId: string,
    featureKey: string,
    isEnabled: boolean,
    config?: Record<string, any>,
    description?: string
  ): Promise<FeatureConfiguration> => {
    return apiClient.put<FeatureConfiguration>(
      `/admin/features/${featureKey}`,
      { isEnabled, configurationPayload: config, configValue: config, description },
      { organizationId }
    );
  },

  deleteFeatureOverride: async (organizationId: string, featureKey: string): Promise<any> => {
    return apiClient.delete(`/admin/features/${featureKey}`, { organizationId });
  },

  // 7. Audit Logs
  listAuditLogs: async (
    organizationId: string,
    params?: { action?: string; actorId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }
  ): Promise<AdminAuditLog[]> => {
    return apiClient.get<AdminAuditLog[]>('/admin/audit-logs', { organizationId, params });
  },
};
