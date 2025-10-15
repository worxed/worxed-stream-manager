import { createTheme } from '@mantine/core';

export const neoTokyoTheme = createTheme({
  primaryColor: 'neon',
  colors: {
    neon: [
      '#FFFF00', // 0 - electric yellow
      '#39FF14', // 1 - matrix green
      '#00D4FF', // 2 - cyber blue
      '#FF0080', // 3 - main electric pink (primary)
      '#6C5CE7', // 4 - electric purple
      '#FF3864', // 5 - hot pink warning
      '#1F1F2E', // 6 - medium dark
      '#151521', // 7 - dark purple-gray
      '#0A0A0F', // 8 - deep space black
      '#000000', // 9 - deepest black
    ],
  },
  fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, sans-serif',
  headings: {
    fontFamily: 'Bebas Neue, Montserrat, sans-serif',
  },
  other: {
    // Custom CSS variables for advanced styling
    gradientBg: 'linear-gradient(135deg, #0A0A0F 0%, #151521 100%)',
    gradientPanel: 'linear-gradient(145deg, #151521 0%, #1F1F2E 100%)',
    shadowNeon: '0 0 20px rgba(255, 0, 128, 0.4)',
    shadowCyber: '0 0 15px rgba(0, 212, 255, 0.3)',
    hoverGlow: 'rgba(255, 0, 128, 0.3)',
    activeGlow: 'rgba(0, 212, 255, 0.4)',
    borderGlow: 'rgba(108, 92, 231, 0.3)',
  },
  components: {
    Button: {
      styles: () => ({
        root: {
          fontFamily: 'Orbitron, monospace',
          fontWeight: 700,
          textTransform: 'uppercase',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
          },
        },
      }),
    },
    Card: {
      styles: (theme) => ({
        root: {
          background: 'rgba(21, 21, 33, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(108, 92, 231, 0.3)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: theme.colors.neon[3],
            boxShadow: '0 0 20px rgba(255, 0, 128, 0.4)',
          },
        },
      }),
    },
  },
});