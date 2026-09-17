import { DomainEventPayload } from '../../../events/event-bus.js';

export type FinanceEventPayload = Omit<DomainEventPayload, 'timestamp'>;
