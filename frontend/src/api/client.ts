export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp?: string;
    [key: string]: unknown;
  };
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;
  public readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    code: string = 'API_ERROR',
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export interface RequestOptions extends RequestInit {
  token?: string | null;
  organizationId?: string | null;
  params?: Record<string, string | number | boolean | undefined | null>;
  unwrapEnvelope?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private tokenGetter: (() => string | null) | null = null;
  private orgIdGetter: (() => string | null) | null = null;
  private explicitToken: string | null = null;
  private explicitTenantId: string | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public configure(auth: {
    getToken: () => string | null;
    getOrganizationId: () => string | null;
  }) {
    this.tokenGetter = auth.getToken;
    this.orgIdGetter = auth.getOrganizationId;
  }

  public setToken(token: string | null) {
    this.explicitToken = token;
  }

  public setTenantId(tenantId: string | null) {
    this.explicitTenantId = tenantId;
  }

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, organizationId, params, headers, unwrapEnvelope = true, ...customConfig } = options;

    const url = new URL(
      endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    );

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }

    const effectiveToken =
      token !== undefined
        ? token
        : this.explicitToken !== null
        ? this.explicitToken
        : this.tokenGetter
        ? this.tokenGetter()
        : null;

    const effectiveOrgId =
      organizationId !== undefined
        ? organizationId
        : this.explicitTenantId !== null
        ? this.explicitTenantId
        : this.orgIdGetter
        ? this.orgIdGetter()
        : null;

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    if (effectiveToken) {
      reqHeaders['Authorization'] = `Bearer ${effectiveToken}`;
    }

    if (effectiveOrgId) {
      reqHeaders['X-Organization-Id'] = effectiveOrgId;
    }

    const response = await fetch(url.toString(), {
      headers: reqHeaders,
      ...customConfig,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    let json: any = null;
    try {
      json = await response.json();
    } catch {
      if (!response.ok) {
        throw new ApiError(
          response.statusText || 'An unexpected HTTP error occurred',
          response.status,
          'HTTP_ERROR'
        );
      }
      return undefined as unknown as T;
    }

    if (!response.ok) {
      const errPayload = json as ApiErrorPayload;
      const code = errPayload?.error?.code || 'UNKNOWN_ERROR';
      const message = errPayload?.error?.message || response.statusText || 'API request failed';
      const details = errPayload?.error?.details;
      const reqId = errPayload?.requestId;

      throw new ApiError(message, response.status, code, details, reqId);
    }

    // If caller requested raw or if envelope is not unwrapped, return json
    if (!unwrapEnvelope) {
      return json as T;
    }

    // Unwrap standard DeVoc OS { data, meta } envelope if present
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data as T;
    }

    return json as T;
  }

  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
