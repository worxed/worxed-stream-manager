# Worxed Stream Manager - Color System

## Multi-Theme System

**Status:** Four professional themes with dark/light mode support (8 combinations) implemented via CSS variables in `frontend/src/index.css`. Themes use `[data-theme]` selectors with hand-written utility CSS classes. Changes propagate in real-time to all connected clients and OBS overlays via Socket.IO.

### CSS Variables

```css
:root {
  /* Semantic color tokens */
  --background, --foreground
  --card, --card-foreground
  --primary, --primary-foreground
  --secondary, --secondary-foreground
  --muted, --muted-foreground
  --accent, --accent-foreground
  --border, --input, --ring
  --destructive, --destructive-foreground
  --success, --success-foreground
  --warning, --warning-foreground
  --info, --info-foreground
  --chart-1 through --chart-5
  /* Ambient & glow */
  --ambient-1, --ambient-2
  --glow-primary
}
```

---

## Theme Definitions

### Theme 1: **Zinc** (Default)

Clean, neutral theme. Uses bare `:root` / `.dark` defaults — no `data-theme` attribute needed.

| Mode | Background | Foreground | Primary | Border |
|------|-----------|------------|---------|--------|
| Light | `#ffffff` | `#09090b` | `#18181b` | `#e4e4e7` |
| Dark | `#09090b` | `#fafafa` | `#fafafa` | `#2e2e33` |

### Theme 2: **Synthetica** (Cool Blue-Gray)

Monochromatic theme with subtle blue tint. OLED-friendly in dark mode.

| Mode | Background | Foreground | Primary | Border |
|------|-----------|------------|---------|--------|
| Light | `#f0f2f8` | `#1a1d2e` | `#334680` | `#c8cad8` |
| Dark | `#0d1020` | `#d0d5e8` | `#6889c8` | `#2a3158` |

### Theme 3: **Magma** (Warm Amber/Fire)

High-energy theme with warm tones. Good for active streaming sessions.

| Mode | Background | Foreground | Primary | Border |
|------|-----------|------------|---------|--------|
| Light | `#faf6f0` | `#2a1a0e` | `#b44d1e` | `#e0d0c0` |
| Dark | `#1a1008` | `#e8ddd0` | `#e07830` | `#3e2e22` |

### Theme 4: **Arctic** (Icy Blue)

Cool, crisp theme. Pairs well with light mode for daytime use.

| Mode | Background | Foreground | Primary | Border |
|------|-----------|------------|---------|--------|
| Light | `#f0f6fc` | `#0e2a4a` | `#1565c0` | `#c0d8f0` |
| Dark | `#08111e` | `#cddaea` | `#42a5f5` | `#1e3350` |

---

## Design Principles

### Accessibility First
- **WCAG AA Compliance**: All text colors maintain 4.5:1 contrast ratio
- **Large Text**: Base font size of 18px for 2K monitor readability
- **Font Choice**: Inter font family for maximum legibility
- **Focus Indicators**: Clear visual feedback for keyboard navigation

### Theme Personalities

| Theme | Feel | Best For |
|-------|------|----------|
| **Zinc** | Clean, minimal, neutral | Default, any context |
| **Synthetica** | Cool, professional, focused | Long sessions, studio work |
| **Magma** | Warm, energetic, powerful | Live streaming, gaming |
| **Arctic** | Crisp, icy, refreshing | Daytime streaming, educational |

---

## Implementation

### Theme Switching

Themes are defined in `frontend/src/themes/themes.ts`. The `applyTheme()` function in `ThemeSwitcher.tsx`:

1. Sets/removes `data-theme` attribute on `<html>` (zinc removes it, others set it)
2. Toggles `.dark` class on `<html>` for dark mode
3. Persists to localStorage for fast load
4. DB settings (`overlay.theme`, `overlay.mode`) are source of truth

### CSS Architecture

Three layers of styling:

1. **CSS Variables** — Semantic color tokens in `:root`, `.dark`, and `[data-theme]` selectors (`index.css`)
2. **Utility CSS Classes** — ~250 hand-written classes matching Tailwind naming (`.flex`, `.text-sm`, `.bg-card`, etc.)
3. **PrimeReact CSS Bridge** — Maps PrimeReact component classes to CSS variables for consistent theming

```css
/* Zinc light = :root defaults */
:root { --background: #ffffff; --primary: #18181b; }

/* Dark mode */
.dark { --background: #09090b; --primary: #fafafa; }

/* Theme overrides */
[data-theme="synthetica"] { --primary: #334680; }
[data-theme="synthetica"].dark { --primary: #6889c8; }

/* Utility classes reference vars */
.bg-primary { background-color: var(--primary); }
.text-foreground { color: var(--foreground); }

/* Opacity variants use color-mix */
.bg-card\/80 { background: color-mix(in srgb, var(--card) 80%, transparent); }
```

### Persistence & Sync
- Theme preference stored in localStorage (fast fallback)
- DB settings (`overlay.theme`, `overlay.mode`) are source of truth
- Automatically applied on app load (`initTheme()` runs before React renders)
- Real-time sync via `settings-changed` Socket.IO event
- Admin can change any connected frontend's theme remotely
- OBS overlays at `/overlay` receive theme updates live

### OBS Overlay
- The `/overlay` route uses transparent background for compositing
- Overlay uses inline styles for OBS browser source compatibility
- Receives theme updates via Socket.IO in real-time

---

## Color Testing

### Contrast Ratios (WCAG AA)
- **Normal Text**: Minimum 4.5:1
- **Large Text (18px+)**: Minimum 3:1
- **UI Components**: Minimum 3:1

### Browser Support
- Modern CSS custom properties (all evergreen browsers)
- `color-mix()` for opacity variants (Chrome 111+, Firefox 113+, Safari 16.2+)

---

**Last Updated:** February 25, 2026
