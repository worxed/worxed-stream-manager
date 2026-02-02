import { useState } from 'react';
import {
  Grid,
  Card,
  Text,
  Group,
  Stack,
  Button,
  Slider,
  ColorSwatch,
  SegmentedControl,
  Box,
  CopyButton,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconMessage,
  IconBell,
  IconChartBar,
  IconDeviceGamepad2,
  IconCopy,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-react';
import { socketService } from '../services/socket';
import type { OverlayType, OverlaySettings, OverlayPreset } from '../types';

const defaultSettings: OverlaySettings = {
  type: 'chat',
  position: { x: 50, y: 50 },
  size: { width: 400, height: 300 },
  colors: {
    primary: '#8cffbe',
    secondary: '#b893ff',
    background: '#121318',
  },
  fontSize: 16,
  borderOpacity: 30,
};

const presets: OverlayPreset[] = [
  {
    id: 'terminal',
    name: 'Default Terminal',
    description: 'Classic worxed terminal theme',
    settings: {
      colors: { primary: '#8cffbe', secondary: '#b893ff', background: '#121318' },
      borderOpacity: 30,
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Hot pink and cyan vibes',
    settings: {
      colors: { primary: '#ff00ff', secondary: '#00ffff', background: '#0d0d0d' },
      borderOpacity: 50,
    },
  },
  {
    id: 'matrix',
    name: 'Matrix Code',
    description: 'Pure green terminal',
    settings: {
      colors: { primary: '#00ff00', secondary: '#00aa00', background: '#000000' },
      borderOpacity: 20,
    },
  },
  {
    id: 'amber',
    name: 'Retro Amber',
    description: 'Old-school amber CRT',
    settings: {
      colors: { primary: '#ffbf00', secondary: '#ff8c00', background: '#1a1200' },
      borderOpacity: 40,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal Clean',
    description: 'Subtle, low-profile',
    settings: {
      colors: { primary: '#ffffff', secondary: '#888888', background: '#000000' },
      borderOpacity: 10,
    },
  },
];

const overlayTypes: Array<{ value: OverlayType; label: string; icon: React.ReactNode }> = [
  { value: 'chat', label: 'CHAT', icon: <IconMessage size={16} /> },
  { value: 'alerts', label: 'ALERTS', icon: <IconBell size={16} /> },
  { value: 'stats', label: 'STATS', icon: <IconChartBar size={16} /> },
  { value: 'game', label: 'GAME', icon: <IconDeviceGamepad2 size={16} /> },
];

export default function Customizer() {
  const [settings, setSettings] = useState<OverlaySettings>(defaultSettings);
  const [activePreset, setActivePreset] = useState<string>('terminal');

  const updateSettings = (updates: Partial<OverlaySettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    socketService.updateOverlay(newSettings);
  };

  const applyPreset = (preset: OverlayPreset) => {
    setActivePreset(preset.id);
    updateSettings(preset.settings);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setActivePreset('terminal');
    socketService.updateOverlay(defaultSettings);
  };

  const getOverlayUrl = () => {
    const params = new URLSearchParams({
      type: settings.type,
      primary: settings.colors.primary,
      secondary: settings.colors.secondary,
      bg: settings.colors.background,
      opacity: settings.borderOpacity.toString(),
      fontSize: settings.fontSize.toString(),
    });
    return `${window.location.origin}/overlay?${params.toString()}`;
  };

  const renderPreview = () => {
    const previewStyle = {
      width: `${settings.size.width}px`,
      maxWidth: '100%',
      height: `${settings.size.height}px`,
      maxHeight: '250px',
      backgroundColor: settings.colors.background,
      border: `2px solid ${settings.colors.primary}`,
      borderRadius: '8px',
      padding: '16px',
      boxShadow: `0 0 20px ${settings.colors.primary}${Math.round(settings.borderOpacity * 2.55).toString(16).padStart(2, '0')}`,
      fontFamily: '"VT323", monospace',
      fontSize: `${settings.fontSize}px`,
      overflow: 'hidden',
    };

    switch (settings.type) {
      case 'chat':
        return (
          <Box style={previewStyle}>
            <Stack gap="xs">
              {['worxed', 'viewer123', 'streamer'].map((user, i) => (
                <Group key={i} gap="xs">
                  <Text span style={{ color: settings.colors.secondary, fontWeight: 'bold' }}>
                    {user}:
                  </Text>
                  <Text span style={{ color: settings.colors.primary }}>
                    {['Welcome to the stream!', 'This looks awesome!', 'Terminal vibes'][i]}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Box>
        );

      case 'alerts':
        return (
          <Box style={{ ...previewStyle, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: settings.colors.primary, fontSize: `${settings.fontSize + 4}px`, textShadow: `0 0 8px ${settings.colors.primary}` }}>
              NEW FOLLOWER!
            </Text>
            <Text style={{ color: settings.colors.secondary, fontSize: `${settings.fontSize + 2}px` }}>
              worxed_viewer
            </Text>
            <Text style={{ color: `${settings.colors.primary}80` }}>
              Thanks for the follow!
            </Text>
          </Box>
        );

      case 'stats':
        return (
          <Box style={previewStyle}>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text style={{ color: `${settings.colors.primary}80` }}>VIEWERS</Text>
                <Text style={{ color: settings.colors.primary }}>1,234</Text>
              </Group>
              <Group justify="space-between">
                <Text style={{ color: `${settings.colors.primary}80` }}>FOLLOWERS</Text>
                <Text style={{ color: settings.colors.primary }}>5,678</Text>
              </Group>
              <Group justify="space-between">
                <Text style={{ color: `${settings.colors.primary}80` }}>UPTIME</Text>
                <Text style={{ color: settings.colors.primary }}>02:34:56</Text>
              </Group>
            </Stack>
          </Box>
        );

      case 'game':
        return (
          <Box style={previewStyle}>
            <Stack gap="xs">
              <Text style={{ color: settings.colors.secondary, fontSize: `${settings.fontSize - 2}px` }}>
                NOW PLAYING
              </Text>
              <Text style={{ color: settings.colors.primary, fontSize: `${settings.fontSize + 2}px` }}>
                Cyberpunk 2077
              </Text>
              <Text style={{ color: `${settings.colors.primary}80`, fontSize: `${settings.fontSize - 2}px` }}>
                Night City Adventures
              </Text>
            </Stack>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Grid>
      {/* Left Sidebar - Controls */}
      <Grid.Col span={{ base: 12, md: 3 }}>
        <Stack gap="md">
          {/* Overlay Type */}
          <Card
            padding="md"
            radius="md"
            styles={{
              root: {
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
              },
            }}
          >
            <Text
              size="sm"
              mb="sm"
              style={{
                fontFamily: '"VT323", monospace',
                color: 'var(--primary-green)',
                letterSpacing: '1px',
              }}
            >
              OVERLAY TYPE
            </Text>
            <SegmentedControl
              value={settings.type}
              onChange={(value) => updateSettings({ type: value as OverlayType })}
              data={overlayTypes.map((t) => ({
                value: t.value,
                label: (
                  <Group gap="xs" wrap="nowrap">
                    {t.icon}
                    <Text size="xs">{t.label}</Text>
                  </Group>
                ),
              }))}
              orientation="vertical"
              fullWidth
              styles={{
                root: {
                  backgroundColor: 'var(--primary-bg)',
                },
              }}
            />
          </Card>

          {/* Size Controls */}
          <Card
            padding="md"
            radius="md"
            styles={{
              root: {
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
              },
            }}
          >
            <Text
              size="sm"
              mb="sm"
              style={{
                fontFamily: '"VT323", monospace',
                color: 'var(--primary-green)',
                letterSpacing: '1px',
              }}
            >
              SIZE
            </Text>

            <Stack gap="sm">
              <Box>
                <Text size="xs" mb="xs" style={{ color: 'var(--text-muted)' }}>
                  Width: {settings.size.width}px
                </Text>
                <Slider
                  value={settings.size.width}
                  min={200}
                  max={800}
                  onChange={(value) =>
                    updateSettings({ size: { ...settings.size, width: value } })
                  }
                  color="green"
                  size="sm"
                />
              </Box>

              <Box>
                <Text size="xs" mb="xs" style={{ color: 'var(--text-muted)' }}>
                  Height: {settings.size.height}px
                </Text>
                <Slider
                  value={settings.size.height}
                  min={100}
                  max={600}
                  onChange={(value) =>
                    updateSettings({ size: { ...settings.size, height: value } })
                  }
                  color="green"
                  size="sm"
                />
              </Box>

              <Box>
                <Text size="xs" mb="xs" style={{ color: 'var(--text-muted)' }}>
                  Font Size: {settings.fontSize}px
                </Text>
                <Slider
                  value={settings.fontSize}
                  min={12}
                  max={32}
                  onChange={(value) => updateSettings({ fontSize: value })}
                  color="green"
                  size="sm"
                />
              </Box>

              <Box>
                <Text size="xs" mb="xs" style={{ color: 'var(--text-muted)' }}>
                  Border Opacity: {settings.borderOpacity}%
                </Text>
                <Slider
                  value={settings.borderOpacity}
                  min={0}
                  max={100}
                  onChange={(value) => updateSettings({ borderOpacity: value })}
                  color="green"
                  size="sm"
                />
              </Box>
            </Stack>
          </Card>

          {/* Colors */}
          <Card
            padding="md"
            radius="md"
            styles={{
              root: {
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
              },
            }}
          >
            <Text
              size="sm"
              mb="sm"
              style={{
                fontFamily: '"VT323", monospace',
                color: 'var(--primary-green)',
                letterSpacing: '1px',
              }}
            >
              COLORS
            </Text>

            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="xs" style={{ color: 'var(--text-muted)' }}>
                  Primary
                </Text>
                <ColorSwatch color={settings.colors.primary} size={24} />
              </Group>
              <Group justify="space-between">
                <Text size="xs" style={{ color: 'var(--text-muted)' }}>
                  Secondary
                </Text>
                <ColorSwatch color={settings.colors.secondary} size={24} />
              </Group>
              <Group justify="space-between">
                <Text size="xs" style={{ color: 'var(--text-muted)' }}>
                  Background
                </Text>
                <ColorSwatch color={settings.colors.background} size={24} />
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Grid.Col>

      {/* Center - Preview */}
      <Grid.Col span={{ base: 12, md: 6 }}>
        <Card
          padding="md"
          radius="md"
          h="100%"
          styles={{
            root: {
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
            },
          }}
        >
          <Group justify="space-between" mb="md">
            <Text
              size="sm"
              style={{
                fontFamily: '"VT323", monospace',
                color: 'var(--primary-green)',
                letterSpacing: '1px',
              }}
            >
              LIVE PREVIEW
            </Text>
            <Group gap="xs">
              <CopyButton value={getOverlayUrl()}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied!' : 'Copy overlay URL'}>
                    <ActionIcon
                      variant="subtle"
                      color={copied ? 'green' : 'gray'}
                      onClick={copy}
                    >
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
              <Tooltip label="Reset to defaults">
                <ActionIcon variant="subtle" color="gray" onClick={resetSettings}>
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <Box
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '300px',
              background: `
                linear-gradient(45deg, rgba(140, 255, 190, 0.02) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(140, 255, 190, 0.02) 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, rgba(140, 255, 190, 0.02) 75%),
                linear-gradient(-45deg, transparent 75%, rgba(140, 255, 190, 0.02) 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              borderRadius: '4px',
            }}
          >
            {renderPreview()}
          </Box>
        </Card>
      </Grid.Col>

      {/* Right Sidebar - Presets */}
      <Grid.Col span={{ base: 12, md: 3 }}>
        <Card
          padding="md"
          radius="md"
          styles={{
            root: {
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
            },
          }}
        >
          <Text
            size="sm"
            mb="sm"
            style={{
              fontFamily: '"VT323", monospace',
              color: 'var(--primary-green)',
              letterSpacing: '1px',
            }}
          >
            QUICK PRESETS
          </Text>

          <Stack gap="xs">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant={activePreset === preset.id ? 'filled' : 'subtle'}
                color="green"
                fullWidth
                onClick={() => applyPreset(preset)}
                styles={{
                  root: {
                    fontFamily: '"VT323", monospace',
                    justifyContent: 'flex-start',
                    height: 'auto',
                    padding: '12px',
                  },
                  inner: {
                    justifyContent: 'flex-start',
                  },
                }}
              >
                <Stack gap={2} align="flex-start">
                  <Text size="sm">{preset.name}</Text>
                  <Text size="xs" c="dimmed">
                    {preset.description}
                  </Text>
                </Stack>
              </Button>
            ))}
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>
  );
}
