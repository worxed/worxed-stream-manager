import { useState, useEffect } from 'react';
import {
  UserPlus,
  Star,
  Coins,
  Users,
  Volume2,
  VolumeX,
  Trash2,
  Loader2,
  Bell,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, ScrollArea, Switch, Slider } from '@/components/ui';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
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
      toast({
        title: `New ${alert.type}!`,
        message: `${alert.username}${alert.amount ? ` - $${alert.amount}` : ''}`,
        type: 'success',
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

  const handleDurationChange = (type: keyof AlertSettings, value: number) => {
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
        return <UserPlus size={20} />;
      case 'subscribe':
        return <Star size={20} />;
      case 'donation':
        return <Coins size={20} />;
      case 'raid':
        return <Users size={20} />;
      default:
        return null;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'follow': return 'follow';
      case 'subscribe': return 'subscribe';
      case 'donation': return 'donation';
      case 'raid': return 'raid';
      default: return 'outline';
    }
  };

  const alertColorMap = {
    follow: { text: 'text-chart-1', border: 'border-chart-1', hover: 'hover:bg-chart-1/10', bg: 'bg-chart-1/10' },
    subscribe: { text: 'text-chart-2', border: 'border-chart-2', hover: 'hover:bg-chart-2/10', bg: 'bg-chart-2/10' },
    donation: { text: 'text-chart-3', border: 'border-chart-3', hover: 'hover:bg-chart-3/10', bg: 'bg-chart-3/10' },
    raid: { text: 'text-chart-4', border: 'border-chart-4', hover: 'hover:bg-chart-4/10', bg: 'bg-chart-4/10' },
  } as const;

  const alertTypes: Array<{ key: keyof AlertSettings; label: string }> = [
    { key: 'follow', label: 'Follows' },
    { key: 'subscribe', label: 'Subscribes' },
    { key: 'donation', label: 'Donations' },
    { key: 'raid', label: 'Raids' },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Alert Settings */}
      <Card variant="elevated">
        <CardHeader border>
          <CardTitle>Alert Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {alertTypes.map(({ key, label }) => {
              const colors = alertColorMap[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-5 p-5 bg-background border border-border rounded-xl transition-all duration-200 hover:border-input"
                >
                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 w-40 shrink-0">
                    <div className={cn('p-2 rounded-xl', colors.bg)}>
                      <span className={colors.text}>
                        {getAlertIcon(key)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                  </div>

                  {/* Enabled */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">Enabled</span>
                    <Switch
                      checked={settings[key].enabled}
                      onCheckedChange={() => handleToggle(key, 'enabled')}
                    />
                  </div>

                  {/* Sound */}
                  <div className="flex items-center gap-3">
                    {settings[key].sound ? (
                      <Volume2 size={14} className="text-foreground" />
                    ) : (
                      <VolumeX size={14} className="text-muted-foreground" />
                    )}
                    <Switch
                      checked={settings[key].sound}
                      onCheckedChange={() => handleToggle(key, 'sound')}
                    />
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-3 flex-1 min-w-[160px]">
                    <span className="text-xs text-muted-foreground font-medium tabular-nums shrink-0 w-8">
                      {(settings[key].duration / 1000).toFixed(1)}s
                    </span>
                    <Slider
                      value={settings[key].duration}
                      min={2000}
                      max={15000}
                      step={500}
                      onChange={(value) => handleDurationChange(key, value)}
                      onChangeEnd={(value) => handleDurationCommit(key, value)}
                    />
                  </div>

                  {/* Test button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestAlert(key)}
                    disabled={loading}
                    className={cn(
                      'shrink-0',
                      colors.border, colors.text, colors.hover
                    )}
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card variant="elevated">
        <CardHeader border>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Alerts</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAlerts}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[340px]">
            <div className="flex flex-col gap-1.5">
              {recentAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 p-4 rounded-2xl bg-muted/50 opacity-60">
                    <Bell size={36} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">No recent alerts</p>
                  <p className="text-xs text-muted-foreground/60">Alerts will appear here when triggered</p>
                </div>
              ) : (
                recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-4 p-3.5 border border-transparent hover:border-border hover:bg-accent/50 transition-all duration-200 rounded-xl"
                  >
                    <Badge variant={getBadgeVariant(alert.type) as any} className="gap-1.5 text-xs">
                      {getAlertIcon(alert.type)}
                      {alert.type}
                    </Badge>

                    <span className="text-sm text-foreground flex-1 font-medium">
                      {alert.username}
                    </span>

                    {alert.amount && (
                      <Badge variant="donation" className="text-xs">
                        ${alert.amount}
                      </Badge>
                    )}

                    {alert.message && (
                      <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {alert.message}
                      </span>
                    )}

                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
