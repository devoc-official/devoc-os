import { UserIdentity, UserMembershipInfo } from '../api/auth.api';

export type { UserIdentity, UserMembershipInfo };

export interface AuthState {
  user: UserIdentity | null;
  person: { id: string } | null;
  token: string | null;
  memberships: UserMembershipInfo[];
  activeOrganization: UserMembershipInfo | null;
  currentOrganization: UserMembershipInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (credentialsOrEmail: { email: string; password: string } | string, maybePassword?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (organizationId: string) => void;
}
