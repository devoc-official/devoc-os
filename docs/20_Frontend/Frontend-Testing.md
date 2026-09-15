# DeVoc OS Frontend Testing Architecture

## 1. Testing Strategy

The DeVoc OS frontend testing architecture verifies that:
1. **The Application Shell** renders correctly, responds to keyboard navigation, and provides responsive layouts across breakpoints.
2. **The Role System** accurately derives active roles from backend person roles and allows perspective switching without mutating backend security.
3. **The Permission UX** properly hides or disables actions based on capability checks without pretending to be a security boundary.
4. **The Centralized API Client** correctly manages JWT authentication tokens, tenant headers (`X-Organization-Id`), standard envelope unwrapping, and normalized error handling.
5. **The Unified Dashboard** accurately composes role cards, attention items, metrics, and activity feeds while gracefully handling loading, empty, and error states.
6. **Core UI Primitives** maintain strict accessibility standards (visible focus, ARIA landmarks, keyboard traps).

---

## 2. Test Execution Commands

```bash
# Run all frontend tests via Vitest
npm --prefix frontend test

# Run frontend tests with coverage report
npm --prefix frontend run test:coverage

# Run tests from repository root
npm run test:frontend

# Run full backend regression suite (ensures 0 regressions)
npm test
```

---

## 3. Test Suites & Coverage Matrix

| Test Suite File | Scope & Invariants Verified |
| :--- | :--- |
| `frontend/src/__tests__/api-client.test.ts` | Tests token injection, `X-Organization-Id` injection, `{ data, meta }` response unwrapping, and error envelope parsing (`400`, `401`, `403`, `404`). |
| `frontend/src/__tests__/role-resolver.test.ts` | Tests resolution of active `PersonRole` records into supported role categories, multi-role profile resolution, and active role switching. |
| `frontend/src/__tests__/permissions.test.ts` | Tests capability validation (`can(capability)`), role-to-capability mappings, and unauthorized action display rules. |
| `frontend/src/__tests__/navigation.test.ts` | Tests dynamic navigation tree filtering based on Active Role + Capabilities + Context Scope. |
| `frontend/src/__tests__/app-shell.test.ts` | Tests rendering of `AppShell`, `Sidebar` collapsible state, `TopBar`, `Breadcrumbs`, and `CommandPalette` invocation. |
| `frontend/src/__tests__/unified-dashboard.test.ts` | Tests dashboard composition, `RoleOverviewCard` generation for active roles, attention list rendering, metrics cards, and loading/empty states. |
| `frontend/src/__tests__/ui-primitives.test.ts` | Tests `Button` variants, `Input` focus/error states, `StatusBadge` colors and text, `MetricCard` tabular figures, and keyboard accessibility. |
