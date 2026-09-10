import { describe, it, expect } from 'vitest';
import { OrganizationEntity, OrganizationProps } from '../../src/modules/organization/domain/organization.entity.js';
import { InvalidStateTransitionError, ValidationError } from '../../src/shared/errors/index.js';

describe('OrganizationEntity Domain Unit Tests', () => {
  it('validates correct organization slugs', () => {
    expect(() => OrganizationEntity.validateSlug('devoc-official')).not.toThrow();
    expect(() => OrganizationEntity.validateSlug('company-123')).not.toThrow();
  });

  it('rejects invalid organization slugs', () => {
    expect(() => OrganizationEntity.validateSlug('Invalid Slug')).toThrow(ValidationError);
    expect(() => OrganizationEntity.validateSlug('slug_with_underscores')).toThrow(ValidationError);
    expect(() => OrganizationEntity.validateSlug('')).toThrow(ValidationError);
  });

  it('allows valid state transitions (active -> suspended -> active)', () => {
    const orgProps: OrganizationProps = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Org',
      slug: 'test-org',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const entity = new OrganizationEntity(orgProps);

    expect(() => entity.validateStatusTransition('suspended')).not.toThrow();
  });

  it('allows active -> archived transition', () => {
    const orgProps: OrganizationProps = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Org',
      slug: 'test-org',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const entity = new OrganizationEntity(orgProps);

    expect(() => entity.validateStatusTransition('archived')).not.toThrow();
  });

  it('prevents state transition out of archived status', () => {
    const orgProps: OrganizationProps = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Org',
      slug: 'test-org',
      status: 'archived',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const entity = new OrganizationEntity(orgProps);

    expect(() => entity.validateStatusTransition('active')).toThrow(InvalidStateTransitionError);
    expect(() => entity.validateStatusTransition('suspended')).toThrow(InvalidStateTransitionError);
  });
});
