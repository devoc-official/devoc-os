import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runMigrations, closeDb } from '../../src/database/index.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { InvalidCredentialsError, AuthenticationError } from '../../src/shared/errors/index.js';

describe('Auth Module Integration Tests', () => {
  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('hashes and compares passwords correctly', async () => {
    const hash = await AuthService.hashPassword('SecretPassword123!');
    expect(hash).not.toBe('SecretPassword123!');
    const valid = await AuthService.comparePassword('SecretPassword123!', hash);
    expect(valid).toBe(true);
    const invalid = await AuthService.comparePassword('WrongPassword', hash);
    expect(invalid).toBe(false);
  });

  it('creates user and performs login successfully', async () => {
    const user = await AuthService.createUser({
      email: 'user1@example.com',
      password: 'MySecurePassword123!',
      fullName: 'Alice User',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('user1@example.com');

    const authResult = await AuthService.login('user1@example.com', 'MySecurePassword123!');
    expect(authResult.accessToken).toBeDefined();
    expect(authResult.user.id).toBe(user.id);

    const verified = AuthService.verifyToken(authResult.accessToken);
    expect(verified.sub).toBe(user.id);
  });

  it('rejects login with invalid password', async () => {
    await expect(AuthService.login('user1@example.com', 'WrongPassword')).rejects.toThrow(
      InvalidCredentialsError
    );
  });

  it('rejects login for non-existent user', async () => {
    await expect(AuthService.login('nonexistent@example.com', 'Password123!')).rejects.toThrow(
      InvalidCredentialsError
    );
  });
});
