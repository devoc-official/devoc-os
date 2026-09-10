import { ValidationError } from '../../../shared/errors/index.js';

export type PersonStatus = 'active' | 'inactive' | 'archived';

export interface PersonProps {
  id: string;
  organizationId: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: PersonStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class PersonValidator {
  public static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      throw new ValidationError('Invalid email address format.');
    }
  }

  public static validateNames(firstName: string, lastName: string): void {
    if (!firstName || firstName.trim().length === 0) {
      throw new ValidationError('First name is required.');
    }
    if (!lastName || lastName.trim().length === 0) {
      throw new ValidationError('Last name is required.');
    }
  }
}
