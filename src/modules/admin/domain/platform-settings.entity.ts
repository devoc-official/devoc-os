import { ValidationError } from '../../../shared/errors/index.js';

export interface PlatformSettingProps {
  key: string;
  value: Record<string, unknown>;
  description?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PlatformSettingEntity {
  public static validateKey(key: string): void {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      throw new ValidationError('Platform setting key is required');
    }
    if (key.length > 100) {
      throw new ValidationError('Platform setting key must not exceed 100 characters');
    }
    const validKeyRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!validKeyRegex.test(key)) {
      throw new ValidationError(`Platform setting key '${key}' contains invalid characters. Allowed: alphanumeric, '.', '_', '-'`);
    }
  }

  public static validateValue(value: unknown): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new ValidationError('Platform setting value must be a valid JSON object');
    }
    return value as Record<string, unknown>;
  }
}
