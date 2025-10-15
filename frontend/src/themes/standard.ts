import { createTheme } from '@mantine/core';

// Professional Dark Theme - Neutral for designers
export const darkTheme = createTheme({
  primaryColor: 'blue',
  colors: {
    dark: [
      '#C9C9C9', // 0 - lightest text
      '#B8B8B8', // 1 - light text  
      '#828282', // 2 - muted text
      '#696969', // 3 - disabled text
      '#424242', // 4 - border
      '#3C3C3C', // 5 - divider
      '#2C2C2C', // 6 - card background
      '#1A1A1A', // 7 - app background
      '#141414', // 8 - darker background
      '#0A0A0A', // 9 - deepest background
    ],
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },
  other: {
    gradientBg: 'linear-gradient(135deg, #1A1A1A 0%, #141414 100%)',
    gradientPanel: 'linear-gradient(145deg, #2C2C2C 0%, #1A1A1A 100%)',
  },
  components: {
    Button: {
      styles: () => ({
        root: {
          fontWeight: 500,
          transition: 'all 0.2s ease',
        },
      }),
    },
    Card: {
      styles: () => ({
        root: {
          backgroundColor: 'var(--mantine-color-dark-6)',
          border: '1px solid var(--mantine-color-dark-4)',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'var(--mantine-color-blue-6)',
          },
        },
      }),
    },
  },
});

// Professional Light Theme - Clean and neutral
export const lightTheme = createTheme({
  primaryColor: 'blue',
  colors: {
    gray: [
      '#F8F9FA', // 0 - lightest background
      '#F1F3F4', // 1 - light background
      '#E9ECEF', // 2 - border light
      '#DEE2E6', // 3 - border
      '#CED4DA', // 4 - border dark
      '#ADB5BD', // 5 - muted text
      '#6C757D', // 6 - text secondary  
      '#495057', // 7 - text primary
      '#343A40', // 8 - text dark
      '#212529', // 9 - text darkest
    ],
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },
  other: {
    gradientBg: 'linear-gradient(135deg, #F8F9FA 0%, #F1F3F4 100%)',
    gradientPanel: 'linear-gradient(145deg, #FFFFFF 0%, #F8F9FA 100%)',
  },
  components: {
    Button: {
      styles: () => ({
        root: {
          fontWeight: 500,
          transition: 'all 0.2s ease',
        },
      }),
    },
    Card: {
      styles: () => ({
        root: {
          backgroundColor: 'white',
          border: '1px solid var(--mantine-color-gray-3)',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'var(--mantine-color-blue-6)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      }),
    },
  },
});