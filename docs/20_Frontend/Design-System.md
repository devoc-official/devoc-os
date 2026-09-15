# DeVoc OS Design System

## 1. Design Direction

DeVoc OS embodies the character of:

> **Premium enterprise software + calm productivity system + modern education platform.**

It conveys trust, structure, sophistication, and focus. It looks like high-grade software built by a serious engineering company for its own operations.

---

## 2. Anti-AI-Slop Invariants

To avoid generic, disposable SaaS aesthetics, DeVoc OS enforces the following strict visual constraints:

| Prohibited Pattern | Required DeVoc Alternative |
| :--- | :--- |
| **Giant purple/blue gradients & gradient backgrounds** | Neutral surfaces with solid background colors (`#F8F9FA` light, `#111315` dark). |
| **Glassmorphism & blurred backdrop-filters everywhere** | Solid, opaque surfaces with subtle borders and clear contrast. |
| **Decorative blobs & floating shapes** | Information hierarchy, purposeful typography, and clean negative space. |
| **Excessive rounded cards (16px–24px)** | Restrained enterprise radius (4px, 6px, 8px, 10px, 12px maximum). |
| **Heavy dropped shadows** | Subtle 1px borders (`#E2E5E8` / `#2A2E33`) and structural dividers. |
| **Emoji UI icons & emoji navigation** | Professional Lucide React icons with consistent 1.5px–1.75px stroke width. |
| **Giant marketing typography inside apps** | Restrained typographic scale tailored for data density and readability. |
| **Unnecessary bouncing/wobbling animations** | Subtle 120ms–200ms functional transitions honoring `prefers-reduced-motion`. |
| **Pill-shaped containers everywhere** | Crisp rectangular badges with 4px–6px radius. |
| **Card-everything grid clutter** | Cohesive table structures, clear section dividers, and progressive disclosure. |

*Note on Brand Color*: The signature DeVoc blue-purple gradient is reserved exclusively for the brand mark / logo and highly restrained focus accents. It is never used as an app surface background.

---

## 3. Color Tokens

### 3.1 Light Theme
Designed for maximum legibility and reduced visual fatigue during long operational sessions.

```css
:root {
  /* Surfaces */
  --bg-app: #F8F9FA;
  --surface-primary: #FFFFFF;
  --surface-secondary: #F4F5F6;
  --surface-tertiary: #EEF0F2;

  /* Typography */
  --text-primary: #17191C;
  --text-secondary: #555B63;
  --text-tertiary: #737982;
  --text-disabled: #A5AAB1;

  /* Borders & Dividers */
  --border-default: #E2E5E8;
  --border-strong: #D4D8DD;
  --divider: #ECEEF0;

  /* Brand Accents */
  --brand-primary: #4F46E5;        /* Deep Indigo */
  --brand-primary-hover: #4338CA;
  --brand-subtle: #EEF2FF;
  --brand-ring: rgba(79, 70, 229, 0.25);

  /* Status Colors */
  --status-success-bg: #ECFDF5;
  --status-success-text: #065F46;
  --status-success-border: #A7F3D0;

  --status-warning-bg: #FFFBEB;
  --status-warning-text: #92400E;
  --status-warning-border: #FDE68A;

  --status-error-bg: #FEF2F2;
  --status-error-text: #991B1B;
  --status-error-border: #FECACA;

  --status-info-bg: #EFF6FF;
  --status-info-text: #1E40AF;
  --status-info-border: #BFDBFE;
}
```

### 3.2 True Dark Theme
A true dark theme avoiding high-glare pure black (`#000000`) and washed-out dark greys.

```css
.dark {
  /* Surfaces */
  --bg-app: #111315;
  --surface-primary: #17191C;
  --surface-secondary: #1D2024;
  --surface-tertiary: #23272C;
  --surface-elevated: #2A2E33;

  /* Typography */
  --text-primary: #F2F4F5;
  --text-secondary: #A8ADB4;
  --text-tertiary: #7A8089;
  --text-disabled: #52575E;

  /* Borders & Dividers */
  --border-default: #2A2E33;
  --border-strong: #383D44;
  --divider: #23272C;

  /* Brand Accents */
  --brand-primary: #6366F1;
  --brand-primary-hover: #4F46E5;
  --brand-subtle: rgba(99, 102, 241, 0.15);
  --brand-ring: rgba(99, 102, 241, 0.35);

  /* Status Colors (Dark mode adjusted) */
  --status-success-bg: rgba(16, 185, 129, 0.12);
  --status-success-text: #34D399;
  --status-success-border: rgba(16, 185, 129, 0.3);

  --status-warning-bg: rgba(245, 158, 11, 0.12);
  --status-warning-text: #FBBF24;
  --status-warning-border: rgba(245, 158, 11, 0.3);

  --status-error-bg: rgba(239, 68, 68, 0.12);
  --status-error-text: #F87171;
  --status-error-border: rgba(239, 68, 68, 0.3);

  --status-info-bg: rgba(59, 130, 246, 0.12);
  --status-info-text: #60A5FA;
  --status-info-border: rgba(59, 130, 246, 0.3);
}
```

---

## 4. Typography

Primary Typeface: **Inter** (sans-serif)

### Scale & Hierarchy

| Role | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | 24px (1.5rem) | 700 (Bold) | 1.25 | -0.02em | Top-level Workspace Titles |
| **H1** | 20px (1.25rem) | 650 (SemiBold) | 1.3 | -0.015em | Page and View Headers |
| **H2** | 16px (1.0rem) | 600 (SemiBold) | 1.35 | -0.01em | Section Headers, Card Titles |
| **H3** | 14px (0.875rem) | 600 (SemiBold) | 1.4 | -0.005em | Grouping Headers, Drawer Subheads |
| **Body** | 14px (0.875rem) | 400 (Regular) | 1.5 | 0 | Primary Content & Inputs |
| **Body Medium**| 14px (0.875rem) | 500 (Medium) | 1.5 | 0 | Actionable labels, Emphasis |
| **Small / Label**| 12px (0.75rem) | 500 (Medium) | 1.4 | 0.01em | Badges, Table Headers, Captions |
| **Metric / Data**| 20px–28px | 600 (SemiBold) | 1.2 | -0.02em | KPI Numbers (`font-feature-settings: 'tnum'`) |

*Tabular Numbers*: For all numeric counters, dates, currencies, and hours, the class `tabular-nums` is applied to preserve vertical column alignment.

---

## 5. Spacing Grid

DeVoc OS strictly adheres to a **4px base grid**:

```text
Space-1   : 4px   (Tight inline spacing, badge padding)
Space-2   : 8px   (Button gap, icon margins, small gap)
Space-3   : 12px  (Form field gap, nested padding)
Space-4   : 16px  (Standard component padding, card padding)
Space-5   : 20px  (Section inner spacing)
Space-6   : 24px  (Card spacing, layout container padding)
Space-8   : 32px  (Major section separation)
Space-10  : 40px  (Header to content margin)
Space-12  : 48px  (Page margin)
Space-16  : 64px  (Empty state block spacing)
Space-20  : 80px  (Hero boundaries)
Space-24  : 96px  (Maximum structural margin)
```

Arbitrary non-grid margins (e.g. `margin: 17px`) are strictly disallowed.

---

## 6. Enterprise Corner Radii

Restrained radius system to preserve crisp, professional architecture:

```text
XS : 4px  (Small badges, checkboxes, tags, indicators)
SM : 6px  (Buttons, text inputs, selects, segmented controls)
MD : 8px  (Cards, dropdown menus, popovers, table containers)
LG : 10px (Dialog modals, floating command palette, drawers)
XL : 12px (Maximum radius, application shell main workspace)
```

Rounded pill buttons (`rounded-full`) are prohibited for primary application controls.

---

## 7. Elevation & Shadows

DeVoc OS uses **structural borders over heavy drop shadows**. Shadows are reserved strictly for floating/elevated surfaces to communicate z-index layering:

- **Surface Card**: Flat surface with 1px `border-default`. No shadow.
- **Dropdown / Popover**: 1px border + `box-shadow: 0 4px 12px rgba(0,0,0,0.08)`.
- **Command Palette / Modal Dialog**: 1px border + `box-shadow: 0 8px 30px rgba(0,0,0,0.12)`.

---

## 8. Iconography

All icons originate from **Lucide React**.
- Standard icon size in menus: `16px` (`w-4 h-4`).
- Standard icon size in buttons: `16px` (`w-4 h-4`).
- Section icon size: `20px` (`w-5 h-5`).
- Stroke width: Fixed `1.75px` across all icons.
- Emojis are strictly banned from UI icons, menus, and table headers.

---

## 9. Motion & Transitions

- Durations: `120ms` to `200ms` maximum.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out).
- Media query: `@media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important; } }`.
