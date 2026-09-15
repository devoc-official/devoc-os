# DeVoc OS Permission UX Architecture

## 1. Principles of Permission UX

1. **Frontend Permissions are for User Experience, Not Security**:
   - The frontend hides or disables controls that the user cannot use to prevent confusion, frustration, and unnecessary error messages.
   - The backend is the sole enforcement boundary.
2. **Never Invent "If Founder, Allow All"**:
   - Role names must not be hardcoded as bypass flags in UI logic.
   - UI controls query capabilities (`can("workforce_time:approve")`), not role names, ensuring future extensibility when custom roles are introduced.

---

## 2. Capability Catalog & Mapping

Capabilities correspond to fine-grained operational abilities defined in `permissions.middleware.ts`:

```typescript
export type Capability =
  | 'recruitment:view'
  | 'recruitment:create'
  | 'recruitment:manage'
  | 'recruitment:admin'
  | 'recruitment:assess'
  | 'recruitment:decide'
  | 'recruitment:offer'
  | 'workforce:view'
  | 'workforce:create'
  | 'workforce:manage'
  | 'workforce:admin'
  | 'workforce:approve'
  | 'workforce_time:view'
  | 'workforce_time:create'
  | 'workforce_time:manage'
  | 'workforce_time:approve'
  | 'workforce_time:admin'
  | 'analytics:view'
  | 'analytics:define'
  | 'admin:manage'
  | 'organization:admin';
```

---

## 3. UI Guidelines: When to Hide vs When to Disable

To maintain a calm, predictable experience:

| Scenario | UX Action | Reason |
| :--- | :--- | :--- |
| **Entire Nav Section or View is Unauthorized** | **Hide** | Avoids cluttering the sidebar with irrelevant links the user will never have access to. |
| **User Can View a Table but Cannot Create Records** | **Hide Action Button** (or Disable with Tooltip) | Keeps the data view clean. |
| **User Can Take Action only under Specific Conditions** (e.g. Timesheet already submitted) | **Disable with Reason Tooltip** | Teaches the user the business lifecycle rule (e.g. "Timesheet cannot be modified after submission"). |
| **User Lacks Specific Approval Authority** | **Hide Approval Buttons** | Prevents confusing non-approvers with pending review buttons. |

---

## 4. Unauthorized Route Handling

If a user navigates to an unauthorized route directly via URL:
1. The route guard evaluates `usePermissions().can(requiredCapability)`.
2. Instead of throwing an unstyled error or crashing, the UI displays an **Accessible Permission Denied Screen**:
   - **Header**: "Access Restricted"
   - **Body**: Explains which organizational role or permission is required to access this resource.
   - **Action**: A primary button linking back to the Unified Dashboard, and a secondary button to switch active organization if the user has multiple memberships.

---

## 5. Error Normalization & Graceful Fallback

When an API call fails due to permission mismatch (`403 Forbidden` or `404 Not Found` for cross-tenant scoping):
- The centralized API client catches the error and normalizes it.
- An inline alert or toast is displayed with the exact human-readable message returned by the backend.
- The UI avoids technical stack traces and provides clear guidance on resolving the issue.
