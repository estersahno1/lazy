# Design System: Lazy — Calm & Gamified Productivity

This design system blends the calming palette of modern fintech interfaces with the spaciousness of Apple Calendar, the gamified engagement of Duolingo, and the clarity of Airbnb and Spotify.

## Visual Direction

- **Atmosphere:** Calm, clean, and organized, yet encouraging and playful.
- **Color Palette:** Dominated by whites and soft grays for breathing room, accented by vibrant purple and pink for focus and progression.
- **Spacing:** Generous white space (Apple Calendar style) to reduce cognitive load.
- **Interactions:** Large, clear touch targets (Airbnb style) and gamified feedback (Duolingo style).
- **Layout:** Mobile-first, RTL (Hebrew), max-width 480px app shell.

---

## Page URL Mapping

| Page | URL | Component | Description |
|------|-----|-----------|-------------|
| Home | `/` | `DashboardPage.jsx` | Greeting, next lesson, weekly status, urgent tasks |
| AI Tasks | `/tasks` | `TaskManagerPage.jsx` | AI task breakdown with timeline steps |
| Schedule | `/schedule` | `SchedulePage.jsx` | Weekly schedule grid with colored blocks |
| Grades | `/grades` | `GradesPage.jsx` | Grade averages, add grade form, course list |

Navigation is handled by **React Router v6** in `App.jsx`. The **BottomNav** component provides Spotify-style bottom tab navigation between all four pages. **AppHeader** shows the Lazy brand, notifications, and profile on every screen.

---

## Colors

| Role | Hex Code | CSS Variable | Usage |
|------|----------|--------------|-------|
| Primary | `#7C4DFF` | `--color-primary` | Brand, active nav, primary CTAs |
| Secondary | `#FF4081` | `--color-secondary` | Progression, rewards, accents |
| Accent | `#E1BEE7` | `--color-accent` | Card backgrounds, subtle highlights |
| Background | `#F8F9FA` | `--color-background` | Main app background |
| Text | `#212121` | `--color-text` | Primary text |
| Error | `#FF5252` | `--color-error` | Destructive actions, alerts |
| Success | `#4CAF50` | `--color-success` | Completion states, progress |

All colors are defined in `src/styles/globals.css`.

---

## Typography

- **Primary Font:** Heebo + Plus Jakarta Sans (Google Fonts)
- **Heading:** Bold / 24px–32px
- **Body:** Regular / 16px (1.5 line height)
- **Caption / Label:** SemiBold / 12px–14px

---

## Layout & Spacing

- **Base Unit:** 8px (`--space-1` through `--space-4`)
- **Border Radius:** 16px (`--border-radius`)
- **Screen Margins:** 24px (`--space-3`)
- **Button Min-Height:** 56px

---

## Components

| Component | Style |
|-----------|-------|
| **Buttons (CTA)** | Full-width, 16px radius, min-height 56px, bold text |
| **Cards** | Subtle shadow, 16px radius, white or accent background, 20–24px padding |
| **Inputs** | Light background, clear focus state with Primary color |
| **Navigation** | Bottom tab bar (Spotify style), active state with Primary background |
| **Progress Bars** | Thick, rounded rings (Duolingo style) with Secondary/Success colors |

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
    │   ├── AppHeader.jsx
    │   ├── BottomNav.jsx
    │   └── Icons.jsx
    ├── pages/
    │   ├── DashboardPage.jsx
    │   ├── TaskManagerPage.jsx
    │   ├── SchedulePage.jsx
    │   └── GradesPage.jsx
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

Open http://localhost:5173 — the app is optimized for mobile widths (≤480px).
