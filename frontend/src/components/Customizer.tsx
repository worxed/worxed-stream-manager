import { useState } from 'react';
import {
  MessageSquare,
  Bell,
  BarChart3,
  Gamepad2,
  Copy,
  Check,
  RefreshCw,
  Palette,
  Maximize2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Slider,
  ColorPicker,
  Tooltip,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { socketService } from '../services/socket';
import type { OverlayType, OverlaySettings, OverlayPreset } from '../types';

const defaultSettings: OverlaySettings = {
  type: 'chat',
  position: { x: 50, y: 50 },
  size: { width: 400, height: 300 },
  colors: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    background: '#09090b',
  },
  fontSize: 16,
  borderOpacity: 30,
};

const presets: OverlayPreset[] = [
  {
    id: 'default',
    name: 'Default Dark',
    description: 'Clean dark theme',
    settings: {
      colors: { primary: '#fafafa', secondary: '#a1a1aa', background: '#09090b' },
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

const overlayTypes: Array<{ value: OverlayType; label: string; icon: React.ReactNode; description: string }> = [
  { value: 'chat', label: 'Chat', icon: <MessageSquare size={18} />, description: 'Live chat messages' },
  { value: 'alerts', label: 'Alerts', icon: <Bell size={18} />, description: 'Follow/sub notifications' },
  { value: 'stats', label: 'Stats', icon: <BarChart3 size={18} />, description: 'Viewer statistics' },
  { value: 'game', label: 'Game', icon: <Gamepad2 size={18} />, description: 'Current game display' },
];

export default function Customizer() {
  const [settings, setSettings] = useState<OverlaySettings>(defaultSettings);
  const [activePreset, setActivePreset] = useState<string>('default');
  const [copied, setCopied] = useState(false);

  const updateSettings = (updates: Partial<OverlaySettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    socketService.updateOverlay(newSettings);
  };

  const updateColor = (key: 'primary' | 'secondary' | 'background', color: string) => {
    updateSettings({
      colors: { ...settings.colors, [key]: color },
    });
    setActivePreset('');
  };

  const applyPreset = (preset: OverlayPreset) => {
    setActivePreset(preset.id);
    updateSettings(preset.settings);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setActivePreset('default');
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

  const copyUrl = async () => {
    await navigator.clipboard.writeText(getOverlayUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPreview = () => {
    window.open(getOverlayUrl(), '_blank', 'width=500,height=400');
  };

  const renderPreview = () => {
    const previewStyle: React.CSSProperties = {
      width: `${Math.min(settings.size.width, 500)}px`,
      maxWidth: '100%',
      height: `${Math.min(settings.size.height, 280)}px`,
      backgroundColor: settings.colors.background,
      border: `2px solid ${settings.colors.primary}`,
      borderRadius: '8px',
      padding: '16px',
      boxShadow: `0 0 20px ${settings.colors.primary}${Math.round(settings.borderOpacity * 2.55).toString(16).padStart(2, '0')}`,
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: `${settings.fontSize}px`,
      overflow: 'hidden',
      transition: 'all 0.3s ease',
    };

    switch (settings.type) {
      case 'chat':
        return (
          <div style={previewStyle}>
            <div className="flex flex-col gap-1">
              {['worxed', 'viewer123', 'streamer'].map((user, i) => (
                <div key={i} className="flex gap-2">
                  <span style={{ color: settings.colors.secondary, fontWeight: 'bold' }}>{user}:</span>
                  <span style={{ color: settings.colors.primary }}>
                    {['Welcome to the stream!', 'This looks awesome!', 'Great vibes'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'alerts':
        return (
          <div style={{ ...previewStyle, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ color: settings.colors.primary, fontSize: `${settings.fontSize + 4}px` }}>
              New Follower!
            </p>
            <p style={{ color: settings.colors.secondary, fontSize: `${settings.fontSize + 2}px` }}>worxed_viewer</p>
            <p style={{ color: `${settings.colors.primary}80` }}>Thanks for the follow!</p>
          </div>
        );

      case 'stats':
        return (
          <div style={previewStyle}>
            <div className="flex flex-col gap-1">
              {[['Viewers', '1,234'], ['Followers', '5,678'], ['Uptime', '02:34:56']].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span style={{ color: `${settings.colors.primary}80` }}>{label}</span>
                  <span style={{ color: settings.colors.primary }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'game':
        return (
          <div style={previewStyle}>
            <p style={{ color: settings.colors.secondary, fontSize: `${settings.fontSize - 2}px` }}>Now Playing</p>
            <p style={{ color: settings.colors.primary, fontSize: `${settings.fontSize + 2}px` }}>Cyberpunk 2077</p>
            <p style={{ color: `${settings.colors.primary}80`, fontSize: `${settings.fontSize - 2}px` }}>Night City Adventures</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Sidebar - Controls */}
      <div className="lg:col-span-3 flex flex-col gap-5">
        {/* Overlay Type */}
        <Card variant="elevated">
          <CardHeader border>
            <CardTitle className="text-sm">Overlay Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              {overlayTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => updateSettings({ type: t.value })}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200',
                    'hover:bg-accent group',
                    settings.type === t.value && 'bg-primary/10 border border-primary/30 shadow-sm'
                  )}
                >
                  <span className={cn(
                    'transition-colors',
                    settings.type === t.value ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )}>
                    {t.icon}
                  </span>
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      settings.type === t.value && 'text-foreground'
                    )}>
                      {t.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Size Controls */}
        <Card variant="elevated">
          <CardHeader border>
            <div className="flex items-center gap-3">
              <Maximize2 size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm">Size & Style</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Width</span>
                  <span className="text-xs font-mono text-foreground">{settings.size.width}px</span>
                </div>
                <Slider
                  value={settings.size.width}
                  min={200}
                  max={800}
                  onChange={(value) => updateSettings({ size: { ...settings.size, width: value } })}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Height</span>
                  <span className="text-xs font-mono text-foreground">{settings.size.height}px</span>
                </div>
                <Slider
                  value={settings.size.height}
                  min={100}
                  max={600}
                  onChange={(value) => updateSettings({ size: { ...settings.size, height: value } })}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Font Size</span>
                  <span className="text-xs font-mono text-foreground">{settings.fontSize}px</span>
                </div>
                <Slider
                  value={settings.fontSize}
                  min={12}
                  max={32}
                  onChange={(value) => updateSettings({ fontSize: value })}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Glow Intensity</span>
                  <span className="text-xs font-mono text-foreground">{settings.borderOpacity}%</span>
                </div>
                <Slider
                  value={settings.borderOpacity}
                  min={0}
                  max={100}
                  onChange={(value) => updateSettings({ borderOpacity: value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card variant="elevated">
          <CardHeader border>
            <div className="flex items-center gap-3">
              <Palette size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm">Colors</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5">
              <ColorPicker
                label="Primary Color"
                value={settings.colors.primary}
                onChange={(color) => updateColor('primary', color)}
              />
              <ColorPicker
                label="Secondary Color"
                value={settings.colors.secondary}
                onChange={(color) => updateColor('secondary', color)}
              />
              <ColorPicker
                label="Background"
                value={settings.colors.background}
                onChange={(color) => updateColor('background', color)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center - Preview */}
      <div className="lg:col-span-6">
        <Card variant="elevated" className="h-full flex flex-col">
          <CardHeader border>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Live Preview</CardTitle>
                <CardDescription>Changes update in real-time</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip content="Open in new window">
                  <Button variant="ghost" size="sm" onClick={openPreview}>
                    <ExternalLink size={16} />
                  </Button>
                </Tooltip>
                <Tooltip content={copied ? 'Copied!' : 'Copy overlay URL'}>
                  <Button variant="ghost" size="sm" onClick={copyUrl}>
                    {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  </Button>
                </Tooltip>
                <Tooltip content="Reset to defaults">
                  <Button variant="ghost" size="sm" onClick={resetSettings}>
                    <RefreshCw size={16} />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <div
              className="w-full flex justify-center items-center p-8 rounded-lg"
              style={{
                background: `
                  linear-gradient(45deg, rgba(113, 113, 122, 0.05) 25%, transparent 25%),
                  linear-gradient(-45deg, rgba(113, 113, 122, 0.05) 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, rgba(113, 113, 122, 0.05) 75%),
                  linear-gradient(-45deg, transparent 75%, rgba(113, 113, 122, 0.05) 75%)
                `,
                backgroundSize: '24px 24px',
              }}
            >
              {renderPreview()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar - Presets */}
      <div className="lg:col-span-3">
        <Card variant="elevated" className="h-full">
          <CardHeader border>
            <div className="flex items-center gap-3">
              <Sparkles size={16} className="text-muted-foreground" />
              <div>
                <CardTitle className="text-sm">Quick Presets</CardTitle>
                <CardDescription>One-click themes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl transition-all duration-200 group',
                    'border border-transparent hover:border-border',
                    'hover:bg-accent',
                    activePreset === preset.id && 'bg-primary/10 border-primary/30 shadow-sm'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Color preview dots */}
                    <div className="flex gap-1.5 shrink-0">
                      <div
                        className="w-4 h-4 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: preset.settings.colors?.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: preset.settings.colors?.secondary }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        'text-sm font-medium truncate',
                        activePreset === preset.id && 'text-foreground'
                      )}>
                        {preset.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{preset.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
