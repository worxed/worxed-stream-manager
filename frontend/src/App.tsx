import { useState, useEffect } from 'react';
import {
  AppShell,
  Group,
  Text,
  NavLink,
  Box,
  Badge,
} from '@mantine/core';
import {
  IconDashboard,
  IconBell,
  IconPalette,
  IconWifi,
  IconWifiOff,
  IconTerminal,
  IconExternalLink,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { socketService } from './services/socket';
import { getSettings } from './services/api';
import { applyTheme, getSavedTheme, getSavedMode } from './themes/themes';
import type { ThemeName, ThemeMode } from './themes/themes';
import Dashboard from './components/Dashboard';
import Alerts from './components/Alerts';
import Customizer from './components/Customizer';
import BackendDashboard from './components/BackendDashboard';
import ThemeSwitcher from './components/ThemeSwitcher';
import Overlay from './components/Overlay';

// Route check before hooks — overlay gets its own render tree
const isOverlay = window.location.pathname === '/overlay';

type View = 'dashboard' | 'alerts' | 'customizer' | 'backend';

export default function App() {
  if (isOverlay) {
    return <Overlay />;
  }

  return <AppMain />;
}

function AppMain() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Apply saved theme and mode on mount
    applyTheme(getSavedTheme(), getSavedMode());

    // Connect to socket
    socketService.connect();

    // Fetch overlay settings from DB and apply on top of localStorage defaults
    getSettings('overlay').then(result => {
      if (!result.data) return;
      for (const setting of result.data) {
        if (setting.key === 'overlay.theme') {
          const theme = setting.value as ThemeName;
          applyTheme(theme, getSavedMode());
        } else if (setting.key === 'overlay.mode') {
          const mode = setting.value as ThemeMode;
          applyTheme(getSavedTheme(), mode);
        } else if (setting.key === 'overlay.fontSize' && typeof setting.value === 'number') {
          document.documentElement.style.fontSize = `${setting.value}px`;
        }
      }
    });

    // Listen for live settings changes from admin
    const unsubSettings = socketService.onSettingsChanged((event) => {
      if (event.deleted) return;
      if (event.key === 'overlay.theme') {
        applyTheme(event.value as ThemeName, getSavedMode());
      } else if (event.key === 'overlay.mode') {
        applyTheme(getSavedTheme(), event.value as ThemeMode);
      } else if (event.key === 'overlay.fontSize' && typeof event.value === 'number') {
        document.documentElement.style.fontSize = `${event.value}px`;
      }
    });

    const unsubConnect = socketService.onConnect(() => {
      setConnected(true);
      notifications.show({
        title: 'Connected',
        message: 'Connected to stream manager backend',
        color: 'green',
      });
    });

    const unsubDisconnect = socketService.onDisconnect((reason) => {
      setConnected(false);
      notifications.show({
        title: 'Disconnected',
        message: `Lost connection: ${reason}`,
        color: 'red',
      });
    });

    return () => {
      unsubSettings();
      unsubConnect();
      unsubDisconnect();
      socketService.disconnect();
    };
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'alerts':
        return <Alerts />;
      case 'customizer':
        return <Customizer />;
      case 'backend':
        return <BackendDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: 'sm' }}
      padding="md"
      styles={{
        main: {
          backgroundColor: 'var(--primary-bg)',
        },
        header: {
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border-color)',
          backdropFilter: 'blur(8px)',
        },
        navbar: {
          backgroundColor: 'var(--surface)',
          borderRight: '1px solid var(--border-color)',
          opacity: 0.98,
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Text
              size="28px"
              fw={700}
              style={{
                color: 'var(--fire-red)',
                letterSpacing: '0.5px',
                textShadow: '0 0 12px rgba(255, 45, 85, 0.6)',
              }}
            >
              WORXED STREAM MANAGER
            </Text>
            <Text
              size="16px"
              fw={500}
              style={{
                color: 'var(--electric-cyan)',
              }}
            >
              v1.0
            </Text>
          </Group>

          <Group>
            <ThemeSwitcher />
            <Badge
              leftSection={connected ? <IconWifi size={14} /> : <IconWifiOff size={14} />}
              color={connected ? 'green' : 'red'}
              variant="outline"
              size="lg"
              styles={{
                root: {
                  fontSize: '16px',
                  fontWeight: 600,
                },
              }}
            >
              {connected ? 'CONNECTED' : 'DISCONNECTED'}
            </Badge>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <NavLink
            active={activeView === 'dashboard'}
            onClick={() => setActiveView('dashboard')}
            label="Dashboard"
            leftSection={<IconDashboard size={20} />}
            styles={{
              root: {
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 500,
                '&[dataActive]': {
                  backgroundColor: 'var(--active-bg)',
                  color: 'var(--primary-green)',
                  fontWeight: 600,
                },
                '&:hover': {
                  backgroundColor: 'var(--hover-bg)',
                },
              },
            }}
          />
          <NavLink
            active={activeView === 'alerts'}
            onClick={() => setActiveView('alerts')}
            label="Alerts"
            leftSection={<IconBell size={20} />}
            styles={{
              root: {
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 500,
                '&[dataActive]': {
                  backgroundColor: 'var(--active-bg)',
                  color: 'var(--primary-green)',
                  fontWeight: 600,
                },
                '&:hover': {
                  backgroundColor: 'var(--hover-bg)',
                },
              },
            }}
          />
          <NavLink
            active={activeView === 'customizer'}
            onClick={() => setActiveView('customizer')}
            label="Overlay Customizer"
            leftSection={<IconPalette size={20} />}
            styles={{
              root: {
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 500,
                '&[dataActive]': {
                  backgroundColor: 'var(--active-bg)',
                  color: 'var(--primary-green)',
                  fontWeight: 600,
                },
                '&:hover': {
                  backgroundColor: 'var(--hover-bg)',
                },
              },
            }}
          />
          <NavLink
            active={activeView === 'backend'}
            onClick={() => setActiveView('backend')}
            label="Backend Monitor"
            leftSection={<IconTerminal size={20} />}
            styles={{
              root: {
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 500,
                '&[dataActive]': {
                  backgroundColor: 'var(--active-bg)',
                  color: 'var(--primary-green)',
                  fontWeight: 600,
                },
                '&:hover': {
                  backgroundColor: 'var(--hover-bg)',
                },
              },
            }}
          />

          <Box style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <NavLink
              component="a"
              href="http://localhost:4001"
              target="_blank"
              label="Admin Console"
              description="Full backend control"
              leftSection={<IconExternalLink size={20} />}
              styles={{
                root: {
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: 'var(--hover-bg)',
                  },
                },
              }}
            />
          </Box>
        </Box>

        <Box style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <Text
            size="14px"
            style={{
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            worxed.com
          </Text>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>{renderView()}</AppShell.Main>
    </AppShell>
  );
}
