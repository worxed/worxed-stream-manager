import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  Text,
  Group,
  Stack,
  Switch,
  Button,
  ScrollArea,
  Badge,
  Slider,
  Box,
} from '@mantine/core';
import {
  IconUserPlus,
  IconStar,
  IconCoin,
  IconUsers,
  IconVolume,
  IconVolumeOff,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { socketService } from '../services/socket';
import { getAlertSettings, updateAlertSettings, triggerTestAlert } from '../services/api';
import type { AlertSettings, Alert } from '../types';

const defaultSettings: AlertSettings = {
  follow: { enabled: true, sound: true, duration: 5000 },
  subscribe: { enabled: true, sound: true, duration: 7000 },
  donation: { enabled: true, sound: true, duration: 10000 },
  raid: { enabled: true, sound: true, duration: 8000 },
};

export default function Alerts() {
  const [settings, setSettings] = useState<AlertSettings>(defaultSettings);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();

    const unsubAlert = socketService.onAlert((alert) => {
      setRecentAlerts((prev) => [alert, ...prev.slice(0, 49)]);
      notifications.show({
        title: `New ${alert.type}!`,
        message: `${alert.username}${alert.amount ? ` - $${alert.amount}` : ''}`,
        color: getAlertColor(alert.type),
      });
    });

    const unsubSettings = socketService.onAlertSettings((newSettings) => {
      setSettings(newSettings);
    });

    return () => {
      unsubAlert();
      unsubSettings();
    };
  }, []);

  const loadSettings = async () => {
    const result = await getAlertSettings();
    if (result.data) {
      setSettings(result.data);
    }
  };

  const handleToggle = async (type: keyof AlertSettings, field: 'enabled' | 'sound') => {
    const newSettings = {
      ...settings,
      [type]: {
        ...settings[type],
        [field]: !settings[type][field],
      },
    };
    setSettings(newSettings);
    await updateAlertSettings(newSettings);
    socketService.updateAlertSettings(newSettings);
  };

  const handleDurationChange = async (type: keyof AlertSettings, value: number) => {
    const newSettings = {
      ...settings,
      [type]: {
        ...settings[type],
        duration: value,
      },
    };
    setSettings(newSettings);
  };

  const handleDurationCommit = async (type: keyof AlertSettings, value: number) => {
    const newSettings = {
      ...settings,
      [type]: {
        ...settings[type],
        duration: value,
      },
    };
    await updateAlertSettings(newSettings);
    socketService.updateAlertSettings(newSettings);
  };

  const handleTestAlert = async (type: string) => {
    setLoading(true);
    await triggerTestAlert(
      type,
      `TestUser${Math.floor(Math.random() * 1000)}`,
      type === 'donation' ? 'Thank you!' : undefined,
      type === 'donation' ? Math.floor(Math.random() * 50) + 5 : undefined
    );
    setLoading(false);
  };

  const clearAlerts = () => {
    setRecentAlerts([]);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <IconUserPlus size={20} />;
      case 'subscribe':
        return <IconStar size={20} />;
      case 'donation':
        return <IconCoin size={20} />;
      case 'raid':
        return <IconUsers size={20} />;
      default:
        return null;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'follow':
        return 'grape';
      case 'subscribe':
        return 'green';
      case 'donation':
        return 'yellow';
      case 'raid':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const alertTypes: Array<{ key: keyof AlertSettings; label: string }> = [
    { key: 'follow', label: 'FOLLOWS' },
    { key: 'subscribe', label: 'SUBSCRIBES' },
    { key: 'donation', label: 'DONATIONS' },
    { key: 'raid', label: 'RAIDS' },
  ];

  return (
    <Stack gap="md">
      {/* Alert Settings */}
      <Card
        padding="lg"
        radius="md"
        styles={{
          root: {
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
          },
        }}
      >
        <Text
          size="lg"
          mb="md"
          style={{
            fontFamily: '"VT323", monospace',
            color: 'var(--primary-green)',
            letterSpacing: '1px',
          }}
        >
          ALERT SETTINGS
        </Text>

        <Grid>
          {alertTypes.map(({ key, label }) => (
            <Grid.Col key={key} span={{ base: 12, sm: 6, md: 3 }}>
              <Box
                p="md"
                style={{
                  background: 'var(--primary-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
              >
                <Group justify="center" mb="sm">
                  <Box style={{ color: `var(--mantine-color-${getAlertColor(key)}-5)` }}>
                    {getAlertIcon(key)}
                  </Box>
                </Group>

                <Text
                  ta="center"
                  size="sm"
                  mb="md"
                  style={{
                    fontFamily: '"VT323", monospace',
                    color: 'var(--primary-green)',
                    letterSpacing: '1px',
                  }}
                >
                  {label}
                </Text>

                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="xs" style={{ color: 'var(--text-muted)' }}>
                      Enabled
                    </Text>
                    <Switch
                      checked={settings[key].enabled}
                      onChange={() => handleToggle(key, 'enabled')}
                      color="green"
                      size="sm"
                    />
                  </Group>

                  <Group justify="space-between">
                    <Text size="xs" style={{ color: 'var(--text-muted)' }}>
                      Sound
                    </Text>
                    <Switch
                      checked={settings[key].sound}
                      onChange={() => handleToggle(key, 'sound')}
                      color="green"
                      size="sm"
                      thumbIcon={
                        settings[key].sound ? (
                          <IconVolume size={10} />
                        ) : (
                          <IconVolumeOff size={10} />
                        )
                      }
                    />
                  </Group>

                  <Box>
                    <Text size="xs" mb="xs" style={{ color: 'var(--text-muted)' }}>
                      Duration: {(settings[key].duration / 1000).toFixed(1)}s
                    </Text>
                    <Slider
                      value={settings[key].duration}
                      min={2000}
                      max={15000}
                      step={500}
                      onChange={(value) => handleDurationChange(key, value)}
                      onChangeEnd={(value) => handleDurationCommit(key, value)}
                      color="green"
                      size="sm"
                      styles={{
                        track: { backgroundColor: 'var(--border-color)' },
                      }}
                    />
                  </Box>
                </Stack>
              </Box>
            </Grid.Col>
          ))}
        </Grid>
      </Card>

      {/* Test Alerts */}
      <Card
        padding="lg"
        radius="md"
        styles={{
          root: {
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
          },
        }}
      >
        <Text
          size="lg"
          mb="md"
          style={{
            fontFamily: '"VT323", monospace',
            color: 'var(--primary-green)',
            letterSpacing: '1px',
          }}
        >
          TEST ALERTS
        </Text>

        <Group>
          {alertTypes.map(({ key, label }) => (
            <Button
              key={key}
              variant="outline"
              color={getAlertColor(key)}
              leftSection={getAlertIcon(key)}
              onClick={() => handleTestAlert(key)}
              loading={loading}
              styles={{
                root: {
                  fontFamily: '"VT323", monospace',
                  letterSpacing: '1px',
                },
              }}
            >
              TEST {label.slice(0, -1)}
            </Button>
          ))}
        </Group>
      </Card>

      {/* Recent Alerts */}
      <Card
        padding="lg"
        radius="md"
        styles={{
          root: {
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
          },
        }}
      >
        <Group justify="space-between" mb="md">
          <Text
            size="lg"
            style={{
              fontFamily: '"VT323", monospace',
              color: 'var(--primary-green)',
              letterSpacing: '1px',
            }}
          >
            RECENT ALERTS
          </Text>
          <Button
            variant="subtle"
            size="xs"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={clearAlerts}
            styles={{
              root: {
                fontFamily: '"VT323", monospace',
              },
            }}
          >
            CLEAR
          </Button>
        </Group>

        <ScrollArea h={300}>
          <Stack gap="xs">
            {recentAlerts.length === 0 ? (
              <Text size="sm" style={{ color: 'var(--text-muted)' }}>
                No recent alerts
              </Text>
            ) : (
              recentAlerts.map((alert) => (
                <Group
                  key={alert.id}
                  gap="sm"
                  p="sm"
                  style={{
                    background: 'var(--primary-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                  }}
                >
                  <Badge
                    size="sm"
                    color={getAlertColor(alert.type)}
                    variant="light"
                    leftSection={getAlertIcon(alert.type)}
                  >
                    {alert.type.toUpperCase()}
                  </Badge>

                  <Text
                    size="sm"
                    style={{ color: 'var(--primary-green)', flex: 1 }}
                  >
                    {alert.username}
                  </Text>

                  {alert.amount && (
                    <Badge color="yellow" variant="light">
                      ${alert.amount}
                    </Badge>
                  )}

                  {alert.message && (
                    <Text
                      size="xs"
                      style={{ color: 'var(--text-muted)', maxWidth: '200px' }}
                      lineClamp={1}
                    >
                      {alert.message}
                    </Text>
                  )}

                  <Text size="xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </Text>
                </Group>
              ))
            )}
          </Stack>
        </ScrollArea>
      </Card>
    </Stack>
  );
}
