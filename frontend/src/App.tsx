import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { darkTheme, lightTheme } from './themes';
import Dashboard from './components/Dashboard';
import ThemeSwitcher from './components/ThemeSwitcher';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

function App() {
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('worxed-theme') as 'dark' | 'light';
    if (saved) setCurrentTheme(saved);
  }, []);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    localStorage.setItem('worxed-theme', newTheme);
  };

  const theme = currentTheme === 'dark' ? darkTheme : lightTheme;

  return (
    <MantineProvider theme={theme} forceColorScheme={currentTheme}>
      <Notifications />
      <div style={{
        background: theme.other?.gradientBg || (currentTheme === 'dark' ? '#1A1A1A' : '#F8F9FA'),
        minHeight: '100vh',
      }}>
        <ThemeSwitcher currentTheme={currentTheme} onToggle={toggleTheme} />
        <Dashboard />
      </div>
    </MantineProvider>
  );
}

export default App;
