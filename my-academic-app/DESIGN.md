# Design System — AcademicApp

This document describes the visual design system and routing structure for the AcademicApp React application.

---

## Page URL Mapping

| Page            | URL           | Component          | Description                              |
|-----------------|---------------|--------------------|------------------------------------------|
| Landing Page    | `/`           | `LandingPage.jsx`  | Home page with hero and feature overview |
| Authentication  | `/auth`       | `AuthPage.jsx`     | Login and registration forms             |
| Dashboard       | `/dashboard`  | `DashboardPage.jsx`| Stats overview and recent activity       |
| Task Manager    | `/tasks`      | `TaskManagerPage.jsx` | Task list with mock data             |

Navigation is handled by **React Router v6** in `App.jsx`. Both the `Navbar` and `Footer` include links to all four routes.

---

## Color Palette

All colors are defined as CSS custom properties in `src/styles/globals.css`.

| Token                    | Value     | Usage                          |
|--------------------------|-----------|--------------------------------|
| `--color-primary`        | `#4f46e5` | Buttons, links, brand accent   |
| `--color-primary-hover`  | `#4338ca` | Hover state for primary        |
| `--color-secondary`      | `#0ea5e9` | Secondary actions              |
| `--color-secondary-hover`| `#0284c7` | Hover state for secondary      |
| `--color-background`     | `#f8fafc` | Page background                |
| `--color-surface`        | `#ffffff` | Cards, navbar, footer          |
| `--color-text`           | `#1e293b` | Body text                      |
| `--color-text-muted`     | `#64748b` | Secondary text, meta info      |
| `--color-border`         | `#e2e8f0` | Borders and dividers           |
| `--color-success`        | `#22c55e` | Completed / success states     |
| `--color-warning`        | `#f59e0b` | In-progress / medium priority  |
| `--color-danger`         | `#ef4444` | High priority / errors         |

---

## Typography

| Token                  | Value                                              |
|------------------------|----------------------------------------------------|
| `--font-family-base`   | `'Segoe UI', system-ui, -apple-system, sans-serif` |
| `--font-family-heading`| Same as base                                       |
| `--font-size-xs`       | `0.75rem` (12px)                                   |
| `--font-size-sm`       | `0.875rem` (14px)                                  |
| `--font-size-base`     | `1rem` (16px)                                      |
| `--font-size-lg`       | `1.125rem` (18px)                                  |
| `--font-size-xl`       | `1.25rem` (20px)                                   |
| `--font-size-2xl`      | `1.5rem` (24px)                                    |
| `--font-size-3xl`      | `2rem` (32px)                                      |

Headings use `h1`–`h3` with the heading font family. Body text defaults to `--font-size-base` with a `1.6` line height.

---

## Spacing & Layout

| Token           | Value    |
|-----------------|----------|
| `--spacing-xs`  | `0.25rem`|
| `--spacing-sm`  | `0.5rem` |
| `--spacing-md`  | `1rem`   |
| `--spacing-lg`  | `1.5rem` |
| `--spacing-xl`  | `2rem`   |
| `--spacing-2xl` | `3rem`   |
| `--max-width`   | `1200px` |

Content is centered inside a `.container` with horizontal padding. Pages use the `.page` class for vertical spacing.

---

## Components

### Buttons (`.btn`)

- `.btn-primary` — filled indigo, used for main CTAs
- `.btn-secondary` — filled sky blue, used for secondary actions
- `.btn-outline` — bordered, used for alternative CTAs

### Cards (`.card`)

White surface with border, border-radius, and subtle shadow. Used for feature blocks, forms, and content sections.

### Badges (`.badge`)

Pill-shaped labels for status and priority:

- `.badge-success` — green (completed)
- `.badge-warning` — amber (in-progress / medium)
- `.badge-danger` — red (high priority)
- `.badge-info` — blue (pending / low)

### Navbar

Sticky top navigation with brand link and route links. Active route is highlighted with `.active` class.

### Footer

Bottom bar with navigation links and copyright notice.

---

## Responsive Breakpoints

| Breakpoint | Behavior                                              |
|------------|-------------------------------------------------------|
| `≤ 768px`  | Navbar stacks vertically; task items stack; smaller headings |
| `≤ 480px`  | Card grid becomes single column; hero buttons stack   |

---

## File Structure

```
my-academic-app/
├── DESIGN.md
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── components/
    │   ├── Navbar.jsx
    │   └── Footer.jsx
    ├── pages/
    │   ├── LandingPage.jsx
    │   ├── AuthPage.jsx
    │   ├── DashboardPage.jsx
    │   └── TaskManagerPage.jsx
    ├── styles/
    │   └── globals.css
    ├── App.jsx
    └── main.jsx
```

---

## Getting Started

```bash
cd my-academic-app
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` by default.
