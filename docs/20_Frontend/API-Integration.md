# DeVoc OS API Integration Architecture

## 1. Centralized API Client

DeVoc OS strictly prohibits scattering raw `fetch()` or `axios()` calls across UI components. All HTTP communications pass through the **Centralized API Client** (`frontend/src/api/client.ts`).

### Key Capabilities:
1. **Automatic Auth Token Injection**: Injects `Authorization: Bearer <token>` from the authentication session.
2. **Automatic Tenant Header Injection**: Injects `X-Organization-Id: <currentOrgId>` on all tenant-scoped calls.
3. **Response Envelope Unwrapping**: Unwraps `{ data, meta }` envelopes automatically into typed domain payloads.
4. **Error Normalization**: Maps backend HTTP errors (`400`, `401`, `403`, `404`, `409`, `422`, `500`) into a standardized `ApiError` instance with machine-readable codes and field-level details.
5. **Request Correlation Tracking**: Propagates `X-Request-Id` and `X-Correlation-Id` headers for audit observability.

---

## 2. API Contract & Response Envelope

All backend endpoints conform to REST V1 specifications under `/api/v1/`.

### Success Envelope
```typescript
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp?: string;
    [key: string]: unknown;
  };
}
```

### Error Envelope
```typescript
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
}
```

---

## 3. Domain API Modules

The API layer is organized into cohesive domain modules:

```text
frontend/src/api/
  ├── client.ts             # Base fetch client with interceptors
  ├── auth.api.ts           # Login, logout, me, refresh
  ├── people.api.ts         # People, roles, employments, skills
  ├── organization.api.ts   # Tenants, branches, BUs, departments, teams
  ├── analytics.api.ts      # Metrics, snapshots, trends (M11)
  ├── workforce-time.api.ts # Schedules, attendance, timesheets, leave (M15)
  ├── projects.api.ts       # Projects, tasks, milestones (M4)
  └── work.api.ts           # Work logs, outcomes, evidence (M5)
```

---

## 4. TanStack Query Conventions

Server state management utilizes TanStack Query v5 with strict query key conventions:

```typescript
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  people: {
    all: (orgId: string) => ['people', orgId] as const,
    detail: (orgId: string, id: string) => ['people', orgId, id] as const,
    roles: (orgId: string, personId: string) => ['people', orgId, personId, 'roles'] as const,
  },
  workforceTime: {
    schedules: (orgId: string) => ['workforce-time', orgId, 'schedules'] as const,
    attendance: (orgId: string, date: string) => ['workforce-time', orgId, 'attendance', date] as const,
    timesheets: (orgId: string) => ['workforce-time', orgId, 'timesheets'] as const,
    leaveBalances: (orgId: string, employmentId: string) => ['workforce-time', orgId, 'leave-balances', employmentId] as const,
  },
  analytics: {
    metrics: (orgId: string) => ['analytics', orgId, 'metrics'] as const,
    snapshot: (orgId: string, metricId: string) => ['analytics', orgId, 'snapshot', metricId] as const,
  },
};
```

- **Stale Time**: Standard operational data defaults to `staleTime: 60_000` (1 minute).
- **Cache Time**: Defaults to `gcTime: 300_000` (5 minutes).
- **Mutations**: Mutation hooks trigger `queryClient.invalidateQueries()` on related query keys to ensure view synchronization without manual page refreshes.
