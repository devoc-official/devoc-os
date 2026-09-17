import { ValidationError } from '../../../shared/errors/index.js';

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export class RoleSkillValidator {
  public static validateCode(code: string): void {
    const codeRegex = /^[A-Z0-9_-]+$/i;
    if (!code || !codeRegex.test(code.trim())) {
      throw new ValidationError('Code must contain only alphanumeric characters, underscores, or hyphens.');
    }
  }

  public static validateProficiencyLevel(level: string): void {
    const validLevels: ProficiencyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (!validLevels.includes(level as ProficiencyLevel)) {
      throw new ValidationError(`Invalid skill proficiency level: ${level}. Allowed: beginner, intermediate, advanced, expert.`);
    }
  }
}
