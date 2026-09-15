import { apiClient } from './client';

export interface UserIdentity {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isPlatformAdmin: boolean;
}

export interface UserMembershipInfo {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: 'org_admin' | 'org_member';
  status: 'active' | 'suspended' | 'invited';
}

export interface LoginResponse {
  accessToken: string;
  user: UserIdentity;
}

export interface MeResponse {
  user: UserIdentity;
  memberships: UserMembershipInfo[];
}

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/login', credentials);
  },

  logout: async (): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>('/auth/logout');
  },

  me: async (): Promise<MeResponse> => {
    return apiClient.get<MeResponse>('/auth/me');
  },
};
