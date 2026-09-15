# DeVoc OS Responsive Strategy

## 1. Responsive Philosophy

DeVoc OS does not simply shrink desktop layouts down to small screens. Instead, it recognizes that **different roles interact with the system through distinct primary form factors**:

| Role Persona | Primary Device Strategy | Layout & Interaction Priority |
| :--- | :--- | :--- |
| **Student** | **Mobile-First** | Clean vertical timeline, quick exercise submission, tap-friendly lesson navigation, mobile review reminders. |
| **Mentor** | **Tablet & Desktop** | Split-screen student review, side-by-side milestone notes, calendar syncs. |
| **Reviewer** | **Desktop & Tablet** | High-density diff review, rubric scoring sidebars, dual-pane qualitative feedback panels. |
| **Employee / Developer** | **Desktop & Mobile** | Mobile quick check-in / check-out, desktop task management and PR review links. |
| **Founder** | **Desktop-First + Responsive** | High-density KPI matrices, multi-BU budget drilldowns, mobile executive digest. |
| **Administrator** | **Desktop-First** | Large data tables, schema inspection, multi-column permission management. |

---

## 2. Breakpoint Grid

Tailwind standard enterprise breakpoints:

```text
sm : 640px   (Mobile landscape & large phones)
md : 768px   (Tablets / iPads)
lg : 1024px  (Small laptops & horizontal tablets)
xl : 1280px  (Standard desktop displays)
2xl: 1536px  (Large enterprise monitors / workstations)
```

---

## 3. Application Shell Responsive Behavior

### 3.1 Desktop (`>= 1024px`)
- **Sidebar**: Fixed vertical sidebar (width: `256px` expanded, `64px` icon-only collapsed).
- **Header**: Persistent TopBar (height: `56px`) with breadcrumbs, tenant switcher, role switcher, and command bar trigger.
- **Content**: Max-width container (`max-w-7xl`) centered with padding `px-6 py-6`.

### 3.2 Tablet (`768px - 1023px`)
- **Sidebar**: Automatically collapses to icon-only mode (`64px`) to preserve workspace width for data tables and side-by-side panels. Hover/click tooltips reveal full navigation labels.
- **TopBar**: Collapses text labels on search and breadcrumbs; preserves role switcher and tenant selector.

### 3.3 Mobile (`< 768px`)
- **Sidebar**: Hidden off-canvas. Activated as an accessible sliding drawer (`Dialog` overlay with focus trap) via a hamburger icon button in the TopBar.
- **TopBar**: Compact height (`48px`). Shows logo, active role indicator badge, and hamburger menu button.
- **Command Palette**: Accessible via top search icon button.
- **Touch Targets**: All clickable buttons and interactive items enforce minimum touch targets of `44px × 44px`.
- **Tables**: Horizontal scrolling with sticky column headers and sticky first identifier column, or responsive card transformation for summary records.
