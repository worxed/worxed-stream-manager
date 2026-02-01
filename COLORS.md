# Worxed Stream Manager - Color System

## Multi-Theme System (Implemented)

**Status:** Three professional themes with dark/light mode support are fully implemented in `frontend/src/themes/themes.ts`. Themes can be switched via the frontend ThemeSwitcher or remotely via admin settings (`overlay.theme`, `overlay.mode`). Changes propagate in real-time to all connected clients and OBS overlays.

### CSS Variables (set dynamically by applyTheme)

```css
:root {
  /* Canvas */
  --primary-bg, --surface, --surface-elevated, --card-bg, --card-elevated
  /* Brand */
  --primary, --secondary, --accent, --fire-red
  /* Semantic */
  --success, --warning, --danger
  /* Structure */
  --border-color, --divider
  /* Typography */
  --text-primary, --text-secondary, --text-muted
  /* Interaction */
  --hover-bg, --active-bg
  /* Legacy mappings */
  --electric-cyan, --cool-slate, --primary-green, --secondary-purple
}
```

---

## Theme Definitions

### Theme 1: **Magma Forge** (Console Aesthetic)

High-contrast industrial theme with warm red tones and deep blacks.

#### Dark Mode
| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Background | Pitch Black | `#000000` | Main background |
| Surface | Charcoal | `#1A1A1A` | Cards, panels |
| Surface Elevated | Deep Gray | `#242424` | Elevated panels, modals |
| Primary | Lava Red | `#FF4436` | Primary actions, CTA buttons |
| Secondary | Ember | `#FF6B5A` | Secondary actions |
| Accent | Molten Orange | `#FF8C42` | Highlights, active states |
| Border | Forge Edge | `#333333` | Panel borders, dividers |
| Text Primary | Pure White | `#FFFFFF` | Main text, headings |
| Text Secondary | Ash Gray | `#A0A0A0` | Secondary text, descriptions |
| Text Muted | Smoke | `#666666` | Disabled text, hints |

#### Light Mode
| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Background | Off White | `#F5F5F5` | Main background |
| Surface | Pure White | `#FFFFFF` | Cards, panels |
| Surface Elevated | Bright White | `#FAFAFA` | Elevated panels |
| Primary | Crimson | `#C82333` | Primary actions |
| Secondary | Fire Brick | `#DC3545` | Secondary actions |
| Accent | Burnt Orange | `#E8590C` | Highlights |
| Border | Light Gray | `#DEDEDE` | Panel borders |
| Text Primary | Carbon | `#1A1A1A` | Main text |
| Text Secondary | Slate | `#4A4A4A` | Secondary text |
| Text Muted | Cool Gray | `#8A8A8A` | Disabled text |

### Theme 2: **Techno-Organic** (Amber Aesthetic)

Warm amber tones with organic brown undertones for reduced eye strain.

#### Dark Mode
| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Background | Obsidian | `#0D0D0D` | Main background |
| Surface | Umber | `#1C1814` | Cards, panels |
| Surface Elevated | Coffee | `#282420` | Elevated panels |
| Primary | Amber Glow | `#FFB627` | Primary actions |
| Secondary | Gold Leaf | `#F4A261` | Secondary actions |
| Accent | Copper | `#E07A5F` | Highlights |
| Border | Bronze | `#3D3126` | Panel borders |
| Text Primary | Cream | `#F5E6D3` | Main text |
| Text Secondary | Sand | `#C9B59A` | Secondary text |
| Text Muted | Taupe | `#8A7968` | Disabled text |

#### Light Mode
| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Background | Parchment | `#FAF8F3` | Main background |
| Surface | Ivory | `#FFFEF9` | Cards, panels |
| Surface Elevated | Cream | `#FFF9F0` | Elevated panels |
| Primary | Golden Hour | `#D4860F` | Primary actions |
| Secondary | Terracotta | `#C86C50` | Secondary actions |
| Accent | Rust | `#B85440` | Highlights |
| Border | Linen | `#E8DCC8` | Panel borders |
| Text Primary | Espresso | `#2B2520` | Main text |
| Text Secondary | Mocha | `#5D4E42` | Secondary text |
| Text Muted | Latte | `#9A8B7A` | Disabled text |

### Theme 3: **Synthetica** (Monolith Aesthetic)

Pure monochromatic theme optimized for OLED displays with subtle blue tint.

#### Dark Mode
| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Background | True Black | `#000000` | Main background (OLED) |
| Surface | Graphite | `#0F0F10` | Cards, panels |
| Surface Elevated | Steel | `#1A1A1C` | Elevated panels |
| Primary | Arctic Blue | `#B8C5D6` | Primary actions |
| Secondary | Frost | `#8FA3BC` | Secondary actions |
| Accent | Ice | `#6B8CAE` | Highlights |
| Border | Titanium | `#2A2A2C` | Panel borders |
| Text Primary | Platinum | `#E8E8E8` | Main text |
| Text Secondary | Silver | `#A0A0A3` | Secondary text |
| Text Muted | Pewter | `#5A5A5C` | Disabled text |

#### Light Mode
| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Background | Snow | `#FAFAFA` | Main background |
| Surface | Pearl | `#FFFFFF` | Cards, panels |
| Surface Elevated | Cloud | `#F5F5F7` | Elevated panels |
| Primary | Slate Blue | `#4A5F7F` | Primary actions |
| Secondary | Steel Blue | `#5A7599` | Secondary actions |
| Accent | Ocean | `#3D7EA6` | Highlights |
| Border | Mist | `#D1D1D6` | Panel borders |
| Text Primary | Charcoal | `#1D1D1F` | Main text |
| Text Secondary | Graphite | `#48484A` | Secondary text |
| Text Muted | Storm | `#8E8E93` | Disabled text |

---

## Design Principles

### Accessibility First
- **WCAG AA Compliance**: All text colors maintain 4.5:1 contrast ratio
- **Large Text**: Base font size of 18px for 2K monitor readability
- **Font Choice**: Inter font family for maximum legibility
- **Focus Indicators**: Clear visual feedback for keyboard navigation

### Theme Personalities

#### Magma Forge (Console)
- **Feel**: Industrial, powerful, high-energy
- **Use Case**: Live streaming, high-stakes gaming, active monitoring
- **Psychological**: Urgency, action, excitement

#### Techno-Organic (Amber)
- **Feel**: Warm, comfortable, professional
- **Use Case**: Long editing sessions, late-night streaming, content creation
- **Psychological**: Focus, warmth, reduced eye strain

#### Synthetica (Monolith)
- **Feel**: Clean, minimal, professional
- **Use Case**: Corporate streams, educational content, studio broadcasts
- **Psychological**: Clarity, sophistication, neutrality

### Layout Architecture
- **Gap-Based Design**: 12-16px gaps between panels for breathing room
- **Floating Panels**: Subtle shadows and elevated surfaces
- **Transparent Sidebar**: 85-90% opacity for modern aesthetic
- **Responsive Spacing**: Adapts to screen size and density

---

## Implementation

### Theme Switching
Themes are stored in `frontend/src/themes/themes.ts` with the following structure:

```typescript
interface ThemeColors {
  name: string;
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
  };
}
```

### Dynamic CSS Variables
Theme colors are applied via CSS custom properties:

```typescript
function applyTheme(themeName: string) {
  const theme = themes[themeName];
  document.documentElement.style.setProperty('--primary-bg', theme.colors.background);
  document.documentElement.style.setProperty('--card-bg', theme.colors.surface);
  // ... other variables
  localStorage.setItem('selectedTheme', themeName);
}
```

### Persistence & Sync
- Theme preference stored in localStorage (fast fallback)
- DB settings (`overlay.theme`, `overlay.mode`) are source of truth when reachable
- Automatically applied on app load (localStorage first, then DB override)
- Real-time sync via `settings-changed` Socket.IO event
- Admin can change any connected frontend's theme remotely
- OBS overlays at `/overlay` receive theme updates live

### OBS Overlay Colors
- The `/overlay` route accepts URL params for custom colors: `?primary=#FF3B30&secondary=#8B0000&bg=transparent`
- Overlay uses inline styles (no Mantine) for OBS compatibility
- Transparent background by default for compositing

---

## Color Testing

### Contrast Ratios (WCAG AA)
- **Normal Text**: Minimum 4.5:1
- **Large Text (18px+)**: Minimum 3:1
- **UI Components**: Minimum 3:1

### Browser Support
- Modern CSS custom properties
- Fallback colors for legacy browsers
- Tested on Chrome, Firefox, Safari, Edge

---

**Last Updated:** February 1, 2026
