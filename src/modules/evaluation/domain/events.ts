import { DomainEventPayload } from '../../../events/event-bus.js';

export type EvaluationEventPayload = Omit<DomainEventPayload, 'timestamp'>;
