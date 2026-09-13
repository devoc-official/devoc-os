import { describe, it, expect } from 'vitest';
import { redactPayload } from '../../src/audit/redaction.js';
import { eventBus, DomainEventPayload } from '../../src/events/event-bus.js';

describe('Milestone 10 — Audit & Events Unit Tests', () => {
  it('1. Redaction — scrubs sensitive keys (password, token, secret, apiKey, creditCard, authHeader)', () => {
    const rawPayload = {
      title: 'User Login',
      password: 'superSecretPassword123',
      token: 'jwt-bearer-token-abc',
      nested: {
        apiKey: 'sk-1234567890',
        creditCard: '4111-2222-3333-4444',
        regularField: 'safeValue',
      },
    };

    const redacted = redactPayload(rawPayload);

    expect(redacted.title).toBe('User Login');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.nested.apiKey).toBe('[REDACTED]');
    expect(redacted.nested.creditCard).toBe('[REDACTED]');
    expect(redacted.nested.regularField).toBe('safeValue');
  });

  it('2. Redaction — truncates payloads exceeding 64KB size limit', () => {
    const hugeArray = new Array(2000).fill('Very Long Text Payload String Segment Requiring Serialization Truncation');
    const hugePayload = {
      largeData: hugeArray,
    };

    const result: any = redactPayload(hugePayload);

    expect(result._truncated).toBe(true);
    expect(result.summary).toContain('exceeding 64KB');
  });

  it('3. Event Bus — attaches canonical event envelope defaults (eventId, version, occurredAt)', () => {
    let capturedEvent: DomainEventPayload | null = null;

    const subscriber = (evt: DomainEventPayload) => {
      capturedEvent = evt;
    };

    eventBus.on('unit.test.event', subscriber);

    eventBus.publish({
      eventName: 'unit.test.event',
      organizationId: 'org-unit-123',
      entityType: 'unit_entity',
      entityId: 'ent-123',
      payload: { key: 'value' },
    });

    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent?.eventId).toBeDefined();
    expect(capturedEvent?.version).toBe('1.0');
    expect(capturedEvent?.occurredAt).toBeDefined();
    expect(capturedEvent?.organizationId).toBe('org-unit-123');

    eventBus.off('unit.test.event', subscriber);
  });
});
