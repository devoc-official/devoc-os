import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../src/app.js';
import { runMigrations } from '../../src/database/migrate.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { OrganizationService } from '../../src/modules/organization/application/organization.service.js';
import { AuditService } from '../../src/audit/audit.service.js';
import { OutboxService } from '../../src/events/outbox.service.js';
import { EventRegistryService } from '../../src/events/event-registry.js';

describe('Milestone 10 — Audit & Events API Integration Tests', () => {
  const app = createApp();
  let token: string;
  let org: any;
  let auditLogId: string;
  let outboxEventId: string;
  const sampleEntityId = uuidv4();

  beforeAll(async () => {
    process.env.USE_PGLITE = 'true';
    await runMigrations();

    const boot = await OrganizationService.bootstrapOrganization({
      name: 'M10 Audit Test Org',
      slug: 'm10-audit-test-org',
      adminEmail: 'admin@m10audit.test',
      adminPassword: 'Password123!',
      adminFullName: 'Admin M10 Audit',
    });

    org = boot.organization;
    const loginRes = await AuthService.login('admin@m10audit.test', 'Password123!');
    token = loginRes.accessToken;

    // Seed event registry for tests
    await EventRegistryService.seedEventRegistry();

    // Record sample audit log
    const log = await AuditService.recordLog({
      organizationId: org.id,
      actorId: boot.adminUser.id,
      action: 'OBLIGATION_ISSUED',
      entityType: 'financial_obligation',
      entityId: sampleEntityId,
      beforeState: { state: 'Draft' },
      afterState: { state: 'Issued' },
      payload: { netAmount: 50000.0, password: 'secretToRedact' },
      requestId: 'req-m10-1',
      correlationId: 'flow-m10-1',
      sourceModule: 'finance',
    });
    if (log) auditLogId = log.id;

    // Stage sample outbox event
    const outboxRecord = await OutboxService.stageOutboxEvent({
      organizationId: org.id,
      eventName: 'financial_obligation.issued',
      entityType: 'financial_obligation',
      entityId: sampleEntityId,
      payload: { netAmount: 50000.0 },
      actorId: boot.adminUser.id,
      requestId: 'req-m10-1',
      correlationId: 'flow-m10-1',
    });
    outboxEventId = outboxRecord.id;
  });

  it('1. GET /api/v1/audit — list audit logs for tenant', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].action).toBeDefined();
  });

  it('2. GET /api/v1/audit/:id — get audit log by ID and verify redaction', async () => {
    const res = await request(app)
      .get(`/api/v1/audit/${auditLogId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(auditLogId);
    expect(res.body.data.payload.password).toBe('[REDACTED]');
  });

  it('3. GET /api/v1/audit/entities/:entityType/:entityId — get entity audit timeline', async () => {
    const res = await request(app)
      .get(`/api/v1/audit/entities/financial_obligation/${sampleEntityId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('4. GET /api/v1/audit/events/registry — list registered domain events', async () => {
    const res = await request(app)
      .get('/api/v1/audit/events/registry')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('5. GET /api/v1/audit/events/outbox — get outbox status health summary', async () => {
    const res = await request(app)
      .get('/api/v1/audit/events/outbox')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data.Dispatched).toBeDefined();
  });

  it('6. POST /api/v1/audit/events/outbox/:id/retry — retry outbox event', async () => {
    const targetEntityId = uuidv4();
    const pendingEvent = await OutboxService.stageOutboxEvent({
      organizationId: org.id,
      eventName: 'person.created',
      entityType: 'person',
      entityId: targetEntityId,
      payload: { name: 'Test Person' },
    });

    // Manually mark event as Failed to simulate retry scenario
    const db = (await import('../../src/database/index.js')).getDbClient();
    await db.query(`UPDATE event_outbox SET status = 'Failed', retry_count = 1 WHERE id = $1;`, [pendingEvent.id]);

    const res = await request(app)
      .post(`/api/v1/audit/events/outbox/${pendingEvent.id}/retry`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', org.id);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Dispatched');
  });
});
