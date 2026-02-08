export type ThemeName = 'zinc' | 'synthetica' | 'magma' | 'arctic';
export type ThemeMode = 'light' | 'dark';

export interface ThemeDefinition {
  name: ThemeName;
  label: string;
  description: string;
  swatches: [string, string]; // [light-primary, dark-primary] for picker UI
}

export const themes: ThemeDefinition[] = [
  { name: 'zinc', label: 'Zinc', description: 'Clean neutral gray', swatches: ['#18181b', '#fafafa'] },
  { name: 'synthetica', label: 'Synthetica', description: 'Cool blue-gray cyberpunk', swatches: ['#334680', '#6889c8'] },
  { name: 'magma', label: 'Magma Forge', description: 'Warm amber and fire', swatches: ['#b44d1e', '#e07830'] },
  { name: 'arctic', label: 'Arctic Command', description: 'Icy blue clarity', swatches: ['#1565c0', '#42a5f5'] },
];

export const THEME_STORAGE_KEY = 'worxed-theme';
export const MODE_STORAGE_KEY = 'worxed-mode';
