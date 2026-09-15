# DeVoc OS Accessibility Architecture (WCAG 2.2 AA)

## 1. Accessibility Commitment

DeVoc OS is engineered from the ground up to achieve full compliance with **WCAG 2.2 Level AA**. Accessibility is treated as a fundamental architectural requirement rather than an afterthought.

---

## 2. Core Accessibility Pillars

### 2.1 Semantic HTML5 Landmarks
Every screen follows a strict semantic structure allowing screen readers to navigate effortlessly:
- `<header>`: TopBar with global actions and profile.
- `<aside>` or `<nav aria-label="Main Navigation">`: Application navigation sidebar.
- `<main id="main-content">`: Main workspace content area.
- `<nav aria-label="Breadcrumb">`: Route hierarchy trail.

A hidden **Skip to Main Content** link is the first focusable element on every page:
```html
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 ...">
  Skip to main content
</a>
```

### 2.2 Color Contrast Ratios
All text and interactive controls exceed WCAG 2.2 AA contrast requirements:
- **Normal Text (14px–18px)**: Minimum contrast of **4.5:1** against underlying surface.
  - Light theme: `#17191C` on `#FFFFFF` (16.2:1) / `#555B63` on `#FFFFFF` (6.8:1).
  - Dark theme: `#F2F4F5` on `#17191C` (14.5:1) / `#A8ADB4` on `#17191C` (7.2:1).
- **Large Text (>= 24px or >= 18.5px bold)**: Minimum contrast of **3.0:1**.
- **UI Components & Graphical Objects**: Borders and active indicators maintain at least **3.0:1** against adjacent surfaces.

### 2.3 Color Independence
Status and state are **never communicated using color alone**. Every status badge, alert, or operational indicator pairs color with:
1. A clear textual label (e.g. "Approved", "Pending", "Failed").
2. A distinct icon (e.g. CheckCircle for success, AlertTriangle for warning, XCircle for error).

### 2.4 Focus Management & Visible Focus Rings
- All interactive elements display a high-contrast, dual-ring focus state:
  ```css
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900
  ```
- Focus is trapped inside modal dialogs and the Command Palette when open.
- When modals close, focus automatically restores to the triggering button.

### 2.5 Keyboard Navigation Standards
- **Tab / Shift+Tab**: Traverses actionable controls in a logical reading sequence.
- **Enter / Space**: Activates buttons, toggles checkboxes, selects menu items.
- **Escape**: Closes open dialogs, popovers, dropdowns, and the Command Palette.
- **Arrow Keys (Up/Down)**: Navigates through dropdown menu items, tabs, and command palette results.
- **Cmd + K / Ctrl + K**: Global shortcut to invoke the Command Palette.

### 2.6 Screen Reader & ARIA Attributes
- `aria-current="page"` applied to active navigation route.
- `aria-expanded="true|false"` on collapsible sidebar, dropdown menus, and accordions.
- `aria-haspopup="dialog|menu"` on modal and menu triggers.
- `aria-live="polite"` on dynamic alert containers and search result counters.
- All icon-only buttons include descriptive `aria-label` attributes (e.g. `<button aria-label="Toggle Navigation Sidebar">`).

### 2.7 Reduced Motion (`prefers-reduced-motion`)
All animations and transitions automatically deactivate when the user has requested reduced motion in their OS preferences:
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
