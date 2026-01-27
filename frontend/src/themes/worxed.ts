import { createTheme, MantineColorsTuple } from '@mantine/core';

// Neon Ember Theme Colors - Fire Red
const neonRed: MantineColorsTuple = [
  '#ffe5e9',
  '#ffccd4',
  '#ff99a8',
  '#ff667c',
  '#ff3350',
  '#FF2D55', // Primary Fire Red - index 5
  '#cc2444',
  '#991b33',
  '#661222',
  '#330911',
];

const electricCyan: MantineColorsTuple = [
  '#e5fffe',
  '#ccfefc',
  '#99fdf9',
  '#66fcf7',
  '#33fcf4',
  '#00FBFF', // Electric Cyan - index 5
  '#00c8cc',
  '#009699',
  '#006466',
  '#003233',
];

const nightshade: MantineColorsTuple = [
  '#e5e5ea',
  '#d1d1d6',
  '#aeaeb2',
  '#8e8e93',
  '#636366',
  '#48484a',
  '#3a3a3c',
  '#2c2c2e',
  '#0F0E17', // Nightshade background - index 8
  '#080709',
];

export const worxedTheme = createTheme({
  primaryColor: 'neonRed',
  colors: {
    neonRed,
    electricCyan,
    dark: nightshade,
  },
  fontFamily: '"VT323", "Fira Code", "JetBrains Mono", monospace',
  headings: {
    fontFamily: '"VT323", "Fira Code", monospace',
  },
  defaultRadius: 'sm',
  other: {
    // Neon Ember - Cyberpunk theme properties
    fireRed: '#FF2D55',
    electricCyan: '#00FBFF',
    nightshade: '#0F0E17',
    coolSlate: '#2C2C2E',
    cardBg: 'rgba(255, 45, 85, 0.08)',
    borderColor: 'rgba(255, 45, 85, 0.4)',
    hoverBg: 'rgba(255, 45, 85, 0.12)',
    activeBg: 'rgba(255, 45, 85, 0.18)',
  },
  components: {
    Button: {
      styles: (theme) => ({
        root: {
          fontFamily: theme.fontFamily,
          fontWeight: 400,
          letterSpacing: '1px',
          transition: 'all 0.2s ease',
        },
      }),
    },
    Card: {
      styles: () => ({
        root: {
          backgroundColor: 'rgba(255, 45, 85, 0.08)',
          border: '1px solid rgba(255, 45, 85, 0.4)',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(255, 45, 85, 0.1)',
        },
      }),
    },
    Paper: {
      styles: () => ({
        root: {
          backgroundColor: 'rgba(255, 45, 85, 0.08)',
          border: '1px solid rgba(255, 45, 85, 0.4)',
        },
      }),
    },
    NavLink: {
      styles: () => ({
        root: {
          fontFamily: '"VT323", monospace',
          letterSpacing: '1px',
        },
      }),
    },
  },
});
