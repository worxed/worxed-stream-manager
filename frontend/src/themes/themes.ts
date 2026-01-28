// Worxed Stream Manager - 2026 Theme System
// Three professional themes with dark/light mode support

export type ThemeName = 'forge' | 'organic' | 'synthetica';
export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  // Core Canvas
  background: string;
  surface: string;
  surfaceElevated: string;
  
  // Brand Colors
  primary: string;
  secondary: string;
  accent: string;
  
  // Semantic
  success: string;
  warning: string;
  danger: string;
  
  // Structure
  border: string;
  divider: string;
  
  // Typography
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Interaction
  hover: string;
  active: string;
}

// THEME 1: MAGMA FORGE - "Command Center" High-Utility Professional
const magmaForgeDark: ThemeColors = {
  background: '#0A0A0A',
  surface: '#141414',
  surfaceElevated: '#1F1F1F',
  primary: '#FF3B30',
  secondary: '#8B0000',
  accent: '#E5E5E5',
  success: '#32D74B',
  warning: '#FF9F0A',
  danger: '#FF3B30',
  border: '#2C2C2E',
  divider: 'rgba(255, 255, 255, 0.1)',
  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  hover: 'rgba(255, 59, 48, 0.1)',
  active: 'rgba(255, 59, 48, 0.2)',
};

const magmaForgeLight: ThemeColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceElevated: '#E5E5EA',
  primary: '#D70015',
  secondary: '#A00010',
  accent: '#1C1C1E',
  success: '#28CD41',
  warning: '#FF9500',
  danger: '#D70015',
  border: '#D1D1D6',
  divider: 'rgba(0, 0, 0, 0.1)',
  text: '#000000',
  textSecondary: '#3A3A3C',
  textMuted: '#8E8E93',
  hover: 'rgba(215, 0, 21, 0.08)',
  active: 'rgba(215, 0, 21, 0.15)',
};

// THEME 2: TECHNO-ORGANIC - "Amber" Warm Dark Fluid & Modern
const technoOrganicDark: ThemeColors = {
  background: '#0D0D0D',
  surface: '#1C1814',
  surfaceElevated: '#282420',
  primary: '#FFB627',
  secondary: '#F4A261',
  accent: '#E07A5F',
  success: '#32D74B',
  warning: '#FFB340',
  danger: '#E07A5F',
  border: '#3D3126',
  divider: 'rgba(255, 255, 255, 0.08)',
  text: '#F5E6D3',
  textSecondary: '#C9B59A',
  textMuted: '#8A7968',
  hover: 'rgba(255, 182, 39, 0.12)',
  active: 'rgba(255, 182, 39, 0.2)',
};

const technoOrganicLight: ThemeColors = {
  background: '#FAF8F3',
  surface: '#FFFEF9',
  surfaceElevated: '#FFF9F0',
  primary: '#D4860F',
  secondary: '#C86C50',
  accent: '#B85440',
  success: '#28CD41',
  warning: '#FF9500',
  danger: '#B85440',
  border: '#E8DCC8',
  divider: 'rgba(0, 0, 0, 0.08)',
  text: '#2B2520',
  textSecondary: '#5D4E42',
  textMuted: '#9A8B7A',
  hover: 'rgba(212, 134, 15, 0.08)',
  active: 'rgba(212, 134, 15, 0.15)',
};

// THEME 3: SYNTHETICA - "Monolith" 2026 Sleek Standard (OLED Optimized)
const syntheticaDark: ThemeColors = {
  background: '#000000',
  surface: '#0F0F10',
  surfaceElevated: '#1A1A1C',
  primary: '#B8C5D6',
  secondary: '#8FA3BC',
  accent: '#6B8CAE',
  success: '#32D74B',
  warning: '#FF9F0A',
  danger: '#FF453A',
  border: '#2A2A2C',
  divider: 'rgba(255, 255, 255, 0.05)',
  text: '#E8E8E8',
  textSecondary: '#A0A0A3',
  textMuted: '#5A5A5C',
  hover: 'rgba(184, 197, 214, 0.1)',
  active: 'rgba(184, 197, 214, 0.18)',
};

const syntheticaLight: ThemeColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F5F7',
  primary: '#4A5F7F',
  secondary: '#5A7599',
  accent: '#3D7EA6',
  success: '#28CD41',
  warning: '#FF9500',
  danger: '#E63946',
  border: '#D1D1D6',
  divider: 'rgba(0, 0, 0, 0.05)',
  text: '#1D1D1F',
  textSecondary: '#48484A',
  textMuted: '#8E8E93',
  hover: 'rgba(74, 95, 127, 0.08)',
  active: 'rgba(74, 95, 127, 0.15)',
};

export const themes: Record<ThemeName, Record<ThemeMode, ThemeColors>> = {
  forge: { dark: magmaForgeDark, light: magmaForgeLight },
  organic: { dark: technoOrganicDark, light: technoOrganicLight },
  synthetica: { dark: syntheticaDark, light: syntheticaLight },
};

export const themeNames: Record<ThemeName, string> = {
  forge: 'Magma Forge',
  organic: 'Techno-Organic',
  synthetica: 'Synthetica',
};

export const themeDescriptions: Record<ThemeName, string> = {
  forge: 'Lava Red • Industrial command center',
  organic: 'Amber Gold • Warm & easy on the eyes',
  synthetica: 'Arctic Blue • Clean monochromatic',
};

// Apply theme with dark/light mode
export function applyTheme(themeName: ThemeName, mode: ThemeMode = 'dark') {
  const theme = themes[themeName][mode];
  const root = document.documentElement;

  // Core Canvas
  root.style.setProperty('--primary-bg', theme.background);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface-elevated', theme.surfaceElevated);
  
  // Brand
  root.style.setProperty('--fire-red', theme.primary);
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--secondary', theme.secondary);
  root.style.setProperty('--accent', theme.accent);
  
  // Semantic
  root.style.setProperty('--success', theme.success);
  root.style.setProperty('--warning', theme.warning);
  root.style.setProperty('--danger', theme.danger);
  
  // Structure
  root.style.setProperty('--border-color', theme.border);
  root.style.setProperty('--divider', theme.divider);
  
  // Typography
  root.style.setProperty('--text-primary', theme.text);
  root.style.setProperty('--text-secondary', theme.textSecondary);
  root.style.setProperty('--text-muted', theme.textMuted);
  
  // Interaction
  root.style.setProperty('--hover-bg', theme.hover);
  root.style.setProperty('--active-bg', theme.active);
  
  // Card styling (modern gaps architecture)
  root.style.setProperty('--card-bg', theme.surface);
  root.style.setProperty('--card-elevated', theme.surfaceElevated);
  
  // Legacy mappings
  root.style.setProperty('--electric-cyan', theme.accent);
  root.style.setProperty('--cool-slate', theme.secondary);
  root.style.setProperty('--primary-green', theme.primary);
  root.style.setProperty('--secondary-purple', theme.accent);

  // Save preferences
  localStorage.setItem('worxed-theme', themeName);
  localStorage.setItem('worxed-theme-mode', mode);
}

// Get saved preferences
export function getSavedTheme(): ThemeName {
  const saved = localStorage.getItem('worxed-theme') as ThemeName;
  return saved && themes[saved] ? saved : 'synthetica';
}

export function getSavedMode(): ThemeMode {
  const saved = localStorage.getItem('worxed-theme-mode') as ThemeMode;
  return saved === 'light' || saved === 'dark' ? saved : 'dark';
}
