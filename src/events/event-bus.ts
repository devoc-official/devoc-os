import { EventEmitter } from 'events';

export interface DomainEventPayload {
  eventName: string;
  organizationId?: string;
  actorId?: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  requestId?: string;
  timestamp: Date;
}

class DomainEventBus extends EventEmitter {
  public publish(event: Omit<DomainEventPayload, 'timestamp'>): void {
    const fullEvent: DomainEventPayload = {
      ...event,
      timestamp: new Date(),
    };
    this.emit(event.eventName, fullEvent);
    this.emit('*', fullEvent);
  }
}

export const eventBus = new DomainEventBus();
