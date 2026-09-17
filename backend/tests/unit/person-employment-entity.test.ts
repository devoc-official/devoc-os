import { describe, it, expect } from 'vitest';
import { PersonValidator } from '../../src/modules/people/domain/person.entity.js';
import { EmploymentStateMachine } from '../../src/modules/people/domain/employment.entity.js';
import { RoleSkillValidator } from '../../src/modules/people/domain/role-skill.entity.js';
import { InvalidStateTransitionError, ValidationError } from '../../src/shared/errors/index.js';

describe('People Engine Domain Unit Tests', () => {
  it('validates person email format', () => {
    expect(() => PersonValidator.validateEmail('user@example.com')).not.toThrow();
    expect(() => PersonValidator.validateEmail('invalid-email')).toThrow(ValidationError);
  });

  it('validates required first and last names', () => {
    expect(() => PersonValidator.validateNames('Alice', 'Smith')).not.toThrow();
    expect(() => PersonValidator.validateNames('', 'Smith')).toThrow(ValidationError);
    expect(() => PersonValidator.validateNames('Alice', '')).toThrow(ValidationError);
  });

  it('allows valid employment status transitions', () => {
    expect(() => EmploymentStateMachine.validateStatusTransition('probation', 'active')).not.toThrow();
    expect(() => EmploymentStateMachine.validateStatusTransition('active', 'suspended')).not.toThrow();
    expect(() => EmploymentStateMachine.validateStatusTransition('suspended', 'active')).not.toThrow();
    expect(() => EmploymentStateMachine.validateStatusTransition('active', 'terminated')).not.toThrow();
    expect(() => EmploymentStateMachine.validateStatusTransition('active', 'resigned')).not.toThrow();
  });

  it('rejects state transitions out of terminal states (terminated / resigned)', () => {
    expect(() => EmploymentStateMachine.validateStatusTransition('terminated', 'active')).toThrow(
      InvalidStateTransitionError
    );
    expect(() => EmploymentStateMachine.validateStatusTransition('resigned', 'active')).toThrow(
      InvalidStateTransitionError
    );
  });

  it('validates role/skill codes and proficiency levels', () => {
    expect(() => RoleSkillValidator.validateCode('ROLE-DEVELOPER')).not.toThrow();
    expect(() => RoleSkillValidator.validateCode('invalid code!')).toThrow(ValidationError);
    expect(() => RoleSkillValidator.validateProficiencyLevel('expert')).not.toThrow();
    expect(() => RoleSkillValidator.validateProficiencyLevel('master')).toThrow(ValidationError);
  });
});
