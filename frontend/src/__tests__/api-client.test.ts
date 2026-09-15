import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError, ApiEnvelope } from '../api/client';

describe('API Client & Envelope Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiClient.setToken(null);
    apiClient.setTenantId(null);
  });

  it('unwraps standard DeVoc { data, meta } success envelopes', async () => {
    const mockPayload = {
      data: { id: 'usr-1', name: 'Devoc User' },
      meta: { timestamp: '2026-09-15T00:00:00Z', correlationId: 'test-123' },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPayload,
    } as Response);

    const result = await apiClient.get<ApiEnvelope<{ id: string; name: string }>>('/users/me', {
      unwrapEnvelope: false,
    });

    expect(result.data).toEqual({ id: 'usr-1', name: 'Devoc User' });
    expect(result.meta).toEqual(mockPayload.meta);

    // Also verify default unwraps data directly
    const unwrapped = await apiClient.get<{ id: string; name: string }>('/users/me');
    expect(unwrapped).toEqual({ id: 'usr-1', name: 'Devoc User' });
  });

  it('automatically injects Authorization and X-Organization-Id headers when set', async () => {
    apiClient.setToken('jwt-token-xyz');
    apiClient.setTenantId('tenant-org-001');

    let capturedHeaders: HeadersInit | undefined;
    global.fetch = vi.fn().mockImplementation((url, options) => {
      capturedHeaders = options.headers;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: { success: true }, meta: {} }),
      } as Response);
    });

    await apiClient.get('/organization/current');

    expect(capturedHeaders).toBeDefined();
    const headers = capturedHeaders as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer jwt-token-xyz');
    expect(headers['X-Organization-Id']).toBe('tenant-org-001');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('normalizes error responses into ApiError with code, message, and details', async () => {
    const errorPayload = {
      error: {
        code: 'TENANT_ISOLATION_VIOLATION',
        message: 'Access denied for foreign tenant entity',
        details: { entityId: 'obj-999' },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => errorPayload,
    } as Response);

    await expect(apiClient.get('/tasks/obj-999')).rejects.toThrow(ApiError);

    try {
      await apiClient.get('/tasks/obj-999');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('TENANT_ISOLATION_VIOLATION');
      expect(err.status).toBe(403);
      expect(err.message).toBe('Access denied for foreign tenant entity');
      expect(err.details).toEqual({ entityId: 'obj-999' });
    }
  });
});
