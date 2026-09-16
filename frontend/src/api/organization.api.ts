import { apiClient } from './client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  status: 'active' | 'suspended' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  location?: string | null;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessUnit {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  headPersonId?: string | null;
  status: 'active' | 'inactive';
}

export interface Department {
  id: string;
  organizationId: string;
  businessUnitId?: string | null;
  name: string;
  code: string;
}

export interface Team {
  id: string;
  organizationId: string;
  departmentId?: string | null;
  businessUnitId?: string | null;
  name: string;
  code: string;
}

export const organizationApi = {
  getOrganization: async (id: string): Promise<Organization> => {
    return apiClient.get<Organization>(`/organizations/${id}`);
  },

  listBranches: async (organizationId: string): Promise<Branch[]> => {
    return apiClient.get<Branch[]>(`/organizations/${organizationId}/branches`);
  },

  listBusinessUnits: async (organizationId: string): Promise<BusinessUnit[]> => {
    return apiClient.get<BusinessUnit[]>(`/organizations/${organizationId}/business-units`);
  },

  listDepartments: async (organizationId: string): Promise<Department[]> => {
    return apiClient.get<Department[]>(`/organizations/${organizationId}/departments`);
  },

  listTeams: async (organizationId: string): Promise<Team[]> => {
    return apiClient.get<Team[]>(`/organizations/${organizationId}/teams`);
  },
};
