import { useState } from 'react';
import { Menu, Button, Text, Group, Box } from '@mantine/core';
import { IconPalette, IconCheck, IconSun, IconMoon } from '@tabler/icons-react';
import { 
  applyTheme, 
  getSavedTheme, 
  getSavedMode,
  themeNames, 
  themeDescriptions, 
  type ThemeName,
  type ThemeMode 
} from '../themes/themes';

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(getSavedTheme());
  const [currentMode, setCurrentMode] = useState<ThemeMode>(getSavedMode());

  const handleThemeChange = (theme: ThemeName, mode?: ThemeMode) => {
    const newMode = mode || currentMode;
    setCurrentTheme(theme);
    setCurrentMode(newMode);
    applyTheme(theme, newMode);
  };

  const toggleMode = () => {
    const newMode: ThemeMode = currentMode === 'dark' ? 'light' : 'dark';
    handleThemeChange(currentTheme, newMode);
  };

  const themes: ThemeName[] = ['forge', 'organic', 'synthetica'];

  return (
    <Group gap="xs">
      {/* Mode Toggle */}
      <Button
        variant="subtle"
        size="sm"
        onClick={toggleMode}
        leftSection={currentMode === 'dark' ? <IconMoon size={14} /> : <IconSun size={14} />}
        styles={{
          root: {
            fontFamily: '"VT323", monospace',
            color: 'var(--text-muted)',
            padding: '4px 12px',
            '&:hover': {
              backgroundColor: 'var(--hover-bg)',
              color: 'var(--text-primary)',
            },
          },
        }}
      >
        {currentMode.toUpperCase()}
      </Button>

      {/* Theme Selector */}
      <Menu shadow="md" width={300}>
        <Menu.Target>
          <Button
            variant="subtle"
            size="sm"
            leftSection={<IconPalette size={14} />}
            styles={{
              root: {
                fontFamily: '"VT323", monospace',
                color: 'var(--text-muted)',
                '&:hover': {
                  backgroundColor: 'var(--hover-bg)',
                  color: 'var(--text-primary)',
                },
              },
            }}
          >
            THEME
          </Button>
        </Menu.Target>

        <Menu.Dropdown
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-color)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <Menu.Label
            style={{
              fontFamily: '"VT323", monospace',
              fontSize: '10px',
              letterSpacing: '2px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Select Theme
          </Menu.Label>
          
          {themes.map((theme) => (
            <Menu.Item
              key={theme}
              onClick={() => handleThemeChange(theme)}
              leftSection={
                currentTheme === theme ? (
                  <IconCheck size={16} style={{ color: 'var(--primary)' }} />
                ) : (
                  <Box w={16} h={16} />
                )
              }
              style={{
                fontFamily: '"VT323", monospace',
                backgroundColor: currentTheme === theme ? 'var(--active-bg)' : 'transparent',
                borderRadius: '6px',
                margin: '2px 0',
              }}
            >
              <Group gap="sm" wrap="nowrap">
                <Box
                  w={14}
                  h={14}
                  style={{
                    borderRadius: '4px',
                    backgroundColor: 
                      theme === 'forge' ? '#FF3B30' : 
                      theme === 'organic' ? '#FF453A' : 
                      '#FF2D55',
                    boxShadow: `0 0 8px ${
                      theme === 'forge' ? 'rgba(255, 59, 48, 0.4)' : 
                      theme === 'organic' ? 'rgba(255, 69, 58, 0.4)' : 
                      'rgba(255, 45, 85, 0.4)'
                    }`,
                    flexShrink: 0,
                  }}
                />
                <Box style={{ flex: 1 }}>
                  <Text size="sm" fw={500} style={{ color: 'var(--text-primary)' }}>
                    {themeNames[theme]}
                  </Text>
                  <Text size="xs" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {themeDescriptions[theme]}
                  </Text>
                </Box>
              </Group>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
