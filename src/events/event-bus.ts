import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface DomainEventPayload {
  eventId?: string;
  eventName: string;
  version?: string;
  organizationId?: string;
  actorId?: string;
  actorPersonId?: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  requestId?: string;
  correlationId?: string;
  occurredAt?: Date | string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

class DomainEventBus extends EventEmitter {
  public publish(event: Omit<DomainEventPayload, 'timestamp'>): void {
    const fullEvent: DomainEventPayload = {
      eventId: event.eventId || uuidv4(),
      version: event.version || '1.0',
      ...event,
      occurredAt: event.occurredAt || new Date(),
      timestamp: new Date(),
    };

    this.emit(event.eventName, fullEvent);
    this.emit('*', fullEvent);
  }
}

export const eventBus = new DomainEventBus();
