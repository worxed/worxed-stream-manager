import { createTheme } from '@mantine/core';

export const fieryTheme = createTheme({
  primaryColor: 'fire',
  colors: {
    fire: [
      '#FFD15C', // 0 - lightest (glow yellow)
      '#FFA040', // 1 - amber gold
      '#FF7518', // 2 - ember orange
      '#FF4C00', // 3 - main neon fire (primary)
      '#A10000', // 4 - crimson warning
      '#5C2E1B', // 5 - rust brown
      '#3A3A3A', // 6 - muted gray
      '#1C1A1A', // 7 - charcoal black
      '#0A0A0A', // 8 - deep black
      '#000000', // 9 - deepest black
    ],
  },
  fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, sans-serif',
  headings: {
    fontFamily: 'Bebas Neue, Montserrat, sans-serif',
  },
  other: {
    // Custom CSS variables for advanced styling
    gradientBg: 'linear-gradient(135deg, #1C1A1A 0%, #0A0A0A 100%)',
    gradientPanel: 'linear-gradient(145deg, #1C1A1A 0%, #5C2E1B 100%)',
    shadowFire: '0 0 20px rgba(255, 76, 0, 0.4)',
    shadowEmber: '0 0 15px rgba(255, 117, 24, 0.3)',
    hoverGlow: 'rgba(255, 76, 0, 0.3)',
    activeGlow: 'rgba(255, 117, 24, 0.5)',
    borderRust: 'rgba(92, 46, 27, 0.8)',
  },
  components: {
    Button: {
      styles: (theme) => ({
        root: {
          fontFamily: 'Orbitron, monospace',
          fontWeight: 700,
          textTransform: 'uppercase',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 0 15px rgba(255, 117, 24, 0.3)',
          },
        },
      }),
    },
    Card: {
      styles: (theme) => ({
        root: {
          background: 'rgba(28, 26, 26, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(92, 46, 27, 0.8)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: theme.colors.fire[3],
            boxShadow: '0 0 20px rgba(255, 76, 0, 0.4)',
          },
        },
      }),
    },
  },
});