import { Button, Group } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';

interface ThemeSwitcherProps {
  currentTheme: 'dark' | 'light';
  onToggle: () => void;
}

export default function ThemeSwitcher({ currentTheme, onToggle }: ThemeSwitcherProps) {
  return (
    <Group 
      style={{ 
        position: 'fixed', 
        top: 20, 
        right: 20, 
        zIndex: 1000 
      }}
    >
      <Button
        onClick={onToggle}
        leftSection={currentTheme === 'dark' ? <IconMoon size={16} /> : <IconSun size={16} />}
        variant="light"
        color="blue"
        size="md"
        radius="md"
      >
        {currentTheme === 'dark' ? 'Dark' : 'Light'}
      </Button>
    </Group>
  );
}