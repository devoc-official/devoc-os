import { ValidationError } from '../../../shared/errors/index.js';

export interface OrganizationSettingsProps {
  organizationId: string;
  timezone: string;
  locale: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  defaultBranchId?: string | null;
  defaultBusinessUnitId?: string | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationSettingsEntity {
  public static validateTimezone(tz: string): void {
    if (!tz || typeof tz !== 'string' || tz.trim().length === 0) {
      throw new ValidationError('Timezone is required');
    }
    if (tz.length > 50) {
      throw new ValidationError('Timezone must not exceed 50 characters');
    }
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      throw new ValidationError(`Invalid IANA timezone identifier '${tz}'`);
    }
  }

  public static validateLocale(locale: string): void {
    if (!locale || typeof locale !== 'string' || locale.trim().length === 0) {
      throw new ValidationError('Locale is required');
    }
    if (locale.length > 20) {
      throw new ValidationError('Locale must not exceed 20 characters');
    }
    const localeRegex = /^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/i;
    if (!localeRegex.test(locale)) {
      throw new ValidationError(`Invalid locale format '${locale}'. Expected format like 'en-US' or 'en'`);
    }
  }

  public static validateCurrency(currency: string): void {
    if (!currency || typeof currency !== 'string' || currency.trim().length === 0) {
      throw new ValidationError('Currency is required');
    }
    const currUpper = currency.toUpperCase().trim();
    if (!/^[A-Z]{3}$/.test(currUpper)) {
      throw new ValidationError(`Invalid ISO 4217 currency code '${currency}'. Expected 3 letters (e.g., 'USD', 'INR', 'EUR')`);
    }
  }

  public static validateTimeFormat(format: string): '12h' | '24h' {
    if (format !== '12h' && format !== '24h') {
      throw new ValidationError(`Invalid time format '${format}'. Allowed values are '12h' or '24h'`);
    }
    return format;
  }

  public static validateDateFormat(format: string): void {
    if (!format || typeof format !== 'string' || format.trim().length === 0) {
      throw new ValidationError('Date format is required');
    }
    if (format.length > 30) {
      throw new ValidationError('Date format must not exceed 30 characters');
    }
  }

  public static validateSettings(settings: unknown): Record<string, unknown> {
    if (settings === undefined || settings === null) {
      return {};
    }
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      throw new ValidationError('Settings must be a valid JSON object');
    }
    return settings as Record<string, unknown>;
  }
}
