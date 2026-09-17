import { InvalidStateTransitionError, ValidationError } from '../../../shared/errors/index.js';

export type OrganizationStatus = 'active' | 'suspended' | 'archived';

export interface OrganizationProps {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationEntity {
  constructor(public readonly props: OrganizationProps) {}

  public static validateSlug(slug: string): void {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slug || !slugRegex.test(slug)) {
      throw new ValidationError('Invalid organization slug. Slugs must be lowercase alphanumeric characters separated by hyphens.');
    }
  }

  public validateStatusTransition(nextStatus: OrganizationStatus): void {
    const current = this.props.status;
    if (current === nextStatus) return;

    if (current === 'archived') {
      throw new InvalidStateTransitionError('Archived organization status cannot be changed.');
    }

    if (current === 'active' && !['suspended', 'archived'].includes(nextStatus)) {
      throw new InvalidStateTransitionError(`Invalid status transition from ${current} to ${nextStatus}.`);
    }

    if (current === 'suspended' && !['active', 'archived'].includes(nextStatus)) {
      throw new InvalidStateTransitionError(`Invalid status transition from ${current} to ${nextStatus}.`);
    }
  }
}
