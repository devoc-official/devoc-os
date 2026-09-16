import { apiClient } from './client';

export interface OrganizationSettings {
  organizationId: string;
  defaultCurrency?: string;
  fiscalYearStartMonth?: number;
  timeZone?: string;
  dateFormat?: string;
  allowSelfRegistration?: boolean;
  updatedAt?: string;
}

export interface OrganizationMember {
  userId: string;
  email: string;
  fullName: string;
  role: 'org_admin' | 'org_member';
  status: 'active' | 'suspended' | 'invited';
  joinedAt: string;
}

export interface FeatureConfiguration {
  featureKey: string;
  isEnabled: boolean;
  configurationPayload?: Record<string, any>;
  description?: string;
}

export interface AdminAuditLog {
  id: string;
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export const adminApi = {
  getSettings: async (organizationId: string): Promise<OrganizationSettings> => {
    return apiClient.get<OrganizationSettings>('/admin/settings', { organizationId });
  },

  updateSettings: async (
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<OrganizationSettings> => {
    return apiClient.put<OrganizationSettings>('/admin/settings', settings, { organizationId });
  },

  listMembers: async (organizationId: string): Promise<OrganizationMember[]> => {
    return apiClient.get<OrganizationMember[]>('/admin/members', { organizationId });
  },

  listFeatures: async (organizationId: string): Promise<FeatureConfiguration[]> => {
    return apiClient.get<FeatureConfiguration[]>('/admin/features', { organizationId });
  },

  setFeatureOverride: async (
    organizationId: string,
    featureKey: string,
    isEnabled: boolean,
    config?: Record<string, any>
  ): Promise<FeatureConfiguration> => {
    return apiClient.put<FeatureConfiguration>(
      `/admin/features/${featureKey}`,
      { isEnabled, configurationPayload: config },
      { organizationId }
    );
  },

  listAuditLogs: async (
    organizationId: string,
    params?: { action?: string; entityType?: string; limit?: number }
  ): Promise<AdminAuditLog[]> => {
    return apiClient.get<AdminAuditLog[]>('/admin/audit-logs', { organizationId, params });
  },
};
