import { apiClient } from './client';

export interface Person {
  id: string;
  organizationId: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface PersonRole {
  id: string;
  organizationId: string;
  personId: string;
  roleId: string;
  roleName?: string;
  roleCode?: string;
  businessUnitId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  status: 'active' | 'inactive' | 'ended';
  startDate: string;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  isSystem: boolean;
  status: 'active' | 'inactive';
}

export interface Employment {
  id: string;
  organizationId: string;
  personId: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'internship';
  status: 'active' | 'on_leave' | 'terminated';
  jobTitle: string;
  startDate: string;
  endDate?: string | null;
}

export const peopleApi = {
  listPeople: async (organizationId: string): Promise<Person[]> => {
    return apiClient.get<Person[]>('/people', { organizationId });
  },

  getPerson: async (organizationId: string, id: string): Promise<Person> => {
    return apiClient.get<Person>(`/people/${id}`, { organizationId });
  },

  listPersonRoles: async (organizationId: string, personId: string): Promise<PersonRole[]> => {
    return apiClient.get<PersonRole[]>(`/people/${personId}/roles`, { organizationId });
  },

  listRoles: async (organizationId: string): Promise<Role[]> => {
    return apiClient.get<Role[]>('/roles', { organizationId });
  },

  listEmployments: async (organizationId: string): Promise<Employment[]> => {
    return apiClient.get<Employment[]>('/employments', { organizationId });
  },
};
