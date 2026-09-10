import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { getDbClient } from '../database/index.js';
import { InvalidCredentialsError, AuthenticationError, ConflictError } from '../shared/errors/index.js';

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

export interface AuthTokens {
  accessToken: string;
  user: UserIdentity;
}

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateToken(user: UserIdentity): string {
    const payload = {
      sub: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
    };
    const options: SignOptions = {
      expiresIn: config.JWT_EXPIRES_IN as unknown as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, config.JWT_SECRET, options);
  }

  public static verifyToken(token: string): { sub: string; email: string; isPlatformAdmin: boolean } {
    try {
      return jwt.verify(token, config.JWT_SECRET) as { sub: string; email: string; isPlatformAdmin: boolean };
    } catch {
      throw new AuthenticationError('Invalid or expired authentication token');
    }
  }

  public static async login(email: string, password: string): Promise<AuthTokens> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      is_active: boolean;
      is_platform_admin: boolean;
    }>('SELECT id, email, password_hash, full_name, is_active, is_platform_admin FROM users WHERE email = $1;', [
      email.toLowerCase().trim(),
    ]);

    if (res.rows.length === 0) {
      throw new InvalidCredentialsError();
    }

    const userRow = res.rows[0];
    if (!userRow.is_active) {
      throw new AuthenticationError('User account is inactive');
    }

    const passwordValid = await this.comparePassword(password, userRow.password_hash);
    if (!passwordValid) {
      throw new InvalidCredentialsError();
    }

    const user: UserIdentity = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      isActive: userRow.is_active,
      isPlatformAdmin: userRow.is_platform_admin,
    };

    const accessToken = this.generateToken(user);
    return { accessToken, user };
  }

  public static async getUserById(userId: string): Promise<UserIdentity | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      email: string;
      full_name: string;
      is_active: boolean;
      is_platform_admin: boolean;
    }>('SELECT id, email, full_name, is_active, is_platform_admin FROM users WHERE id = $1;', [userId]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      isActive: row.is_active,
      isPlatformAdmin: row.is_platform_admin,
    };
  }

  public static async getUserByEmail(email: string): Promise<UserIdentity | null> {
    const db = getDbClient();
    const res = await db.query<{
      id: string;
      email: string;
      full_name: string;
      is_active: boolean;
      is_platform_admin: boolean;
    }>('SELECT id, email, full_name, is_active, is_platform_admin FROM users WHERE email = $1;', [
      email.toLowerCase().trim(),
    ]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      isActive: row.is_active,
      isPlatformAdmin: row.is_platform_admin,
    };
  }

  public static async getUserMemberships(userId: string): Promise<UserMembershipInfo[]> {
    const db = getDbClient();
    const res = await db.query<{
      membership_id: string;
      organization_id: string;
      organization_name: string;
      organization_slug: string;
      role: 'org_admin' | 'org_member';
      status: 'active' | 'suspended' | 'invited';
    }>(
      `SELECT m.id AS membership_id, o.id AS organization_id, o.name AS organization_name, o.slug AS organization_slug, m.role, m.status
       FROM organization_memberships m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1 AND o.status != 'archived';`,
      [userId]
    );

    return res.rows.map((row) => ({
      membershipId: row.membership_id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      organizationSlug: row.organization_slug,
      role: row.role,
      status: row.status,
    }));
  }

  public static async createUser(data: {
    email: string;
    password: string;
    fullName: string;
    isPlatformAdmin?: boolean;
  }): Promise<UserIdentity> {
    const db = getDbClient();
    const existing = await db.query('SELECT id FROM users WHERE email = $1;', [data.email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      throw new ConflictError('User with this email already exists');
    }

    const passwordHash = await this.hashPassword(data.password);
    const res = await db.query<{
      id: string;
      email: string;
      full_name: string;
      is_active: boolean;
      is_platform_admin: boolean;
    }>(
      `INSERT INTO users (email, password_hash, full_name, is_platform_admin)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, is_active, is_platform_admin;`,
      [data.email.toLowerCase().trim(), passwordHash, data.fullName, data.isPlatformAdmin || false]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      isActive: row.is_active,
      isPlatformAdmin: row.is_platform_admin,
    };
  }
}
