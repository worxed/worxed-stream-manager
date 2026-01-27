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
  background: '#0F0D0C',
  surface: '#1A1716',
  surfaceElevated: '#262220',
  primary: '#FF453A',
  secondary: '#B33A3A',
  accent: '#5E5E5E',
  success: '#32D74B',
  warning: '#FFB340',
  danger: '#FF453A',
  border: '#322E2C',
  divider: 'rgba(255, 255, 255, 0.08)',
  text: '#FAF9F6',
  textSecondary: '#C7C5C0',
  textMuted: '#8E8B87',
  hover: 'rgba(255, 69, 58, 0.12)',
  active: 'rgba(255, 69, 58, 0.2)',
};

const technoOrganicLight: ThemeColors = {
  background: '#FAF9F6',
  surface: '#FFFFFF',
  surfaceElevated: '#F4F1EA',
  primary: '#C42B2B',
  secondary: '#822020',
  accent: '#4A4542',
  success: '#28CD41',
  warning: '#FF9500',
  danger: '#C42B2B',
  border: '#E8E3D9',
  divider: 'rgba(0, 0, 0, 0.08)',
  text: '#1A1716',
  textSecondary: '#4A4542',
  textMuted: '#8E8B87',
  hover: 'rgba(196, 43, 43, 0.08)',
  active: 'rgba(196, 43, 43, 0.15)',
};

// THEME 3: SYNTHETICA - "Monolith" 2026 Sleek Standard (OLED Optimized)
const syntheticaDark: ThemeColors = {
  background: '#000000',
  surface: '#111111',
  surfaceElevated: '#222222',
  primary: '#FF2D55',
  secondary: '#2C2C2E',
  accent: 'rgba(255, 255, 255, 0.05)',
  success: '#32D74B',
  warning: '#FF9F0A',
  danger: '#FF2D55',
  border: 'rgba(255, 255, 255, 0.1)',
  divider: 'rgba(255, 255, 255, 0.05)',
  text: '#EDEDED',
  textSecondary: '#98989F',
  textMuted: '#48484A',
  hover: 'rgba(255, 45, 85, 0.1)',
  active: 'rgba(255, 45, 85, 0.18)',
};

const syntheticaLight: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F9F9FB',
  surfaceElevated: '#F0F0F3',
  primary: '#E63946',
  secondary: '#1D3557',
  accent: '#A8DAD6',
  success: '#28CD41',
  warning: '#FF9500',
  danger: '#E63946',
  border: '#E1E1E1',
  divider: 'rgba(0, 0, 0, 0.05)',
  text: '#1A1A1A',
  textSecondary: '#48484A',
  textMuted: '#8E8E93',
  hover: 'rgba(230, 57, 70, 0.08)',
  active: 'rgba(230, 57, 70, 0.15)',
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
  forge: 'Command Center • High-utility professional',
  organic: 'Amber Warmth • Fluid & modern',
  synthetica: 'Monolith • 2026 sleek standard',
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
