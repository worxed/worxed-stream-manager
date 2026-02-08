import { useState, useEffect } from 'react';
import {
  UserPlus,
  Star,
  Coins,
  Users,
  Volume2,
  VolumeX,
  Bell,
} from 'lucide-react';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ScrollPanel } from 'primereact/scrollpanel';
import { InputSwitch } from 'primereact/inputswitch';
import { Slider } from 'primereact/slider';
import { showToast } from '../services/toast';
import { socketService } from '../services/socket';
import { getAlertSettings, updateAlertSettings, triggerTestAlert } from '../services/api';
import type { AlertSettings, Alert } from '../types';
import EmptyState from './common/EmptyState';

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
      showToast('success', `New ${alert.type}!`, `${alert.username}${alert.amount ? ` - $${alert.amount}` : ''}`);
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

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'follow': return 'worxed-badge-follow';
      case 'donation': return 'worxed-badge-donation';
      default: return '';
    }
  };

  const getBadgeSeverity = (type: string) => {
    switch (type) {
      case 'follow': return null;
      case 'subscribe': return 'success';
      case 'donation': return null;
      case 'raid': return 'info';
      default: return 'secondary';
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

  const recentAlertsIcons = (
    <Button
      icon="pi pi-trash"
      label="Clear"
      text
      size="small"
      severity="danger"
      onClick={clearAlerts}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Alert Settings */}
      <Panel header="Alert Settings" className="card-elevated">
        <div className="flex flex-col gap-5">
          {alertTypes.map(({ key, label }) => {
            const colors = alertColorMap[key];
            return (
              <div
                key={key}
                className="flex items-center gap-5 p-5 bg-background border border-border rounded-xl transition-all duration-200 hover:border-input"
              >
                {/* Icon + Name */}
                <div className="flex items-center gap-3 w-40 shrink-0">
                  <div className={`p-2 rounded-xl ${colors.bg}`}>
                    <span className={colors.text}>
                      {getAlertIcon(key)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </div>

                {/* Enabled */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-medium">Enabled</span>
                  <InputSwitch
                    checked={settings[key].enabled}
                    onChange={() => handleToggle(key, 'enabled')}
                  />
                </div>

                {/* Sound */}
                <div className="flex items-center gap-3">
                  {settings[key].sound ? (
                    <Volume2 size={14} className="text-foreground" />
                  ) : (
                    <VolumeX size={14} className="text-muted-foreground" />
                  )}
                  <InputSwitch
                    checked={settings[key].sound}
                    onChange={() => handleToggle(key, 'sound')}
                  />
                </div>

                {/* Duration */}
                <div className="flex items-center gap-3 flex-1 min-w-40">
                  <span className="text-xs text-muted-foreground font-medium tabular-nums shrink-0 w-8">
                    {(settings[key].duration / 1000).toFixed(1)}s
                  </span>
                  <Slider
                    value={settings[key].duration}
                    min={2000}
                    max={15000}
                    step={500}
                    onChange={(e) => handleDurationChange(key, e.value as number)}
                    onSlideEnd={(e) => handleDurationCommit(key, e.value as number)}
                    className="flex-1"
                  />
                </div>

                {/* Test button */}
                <Button
                  label={loading ? undefined : 'Test'}
                  icon={loading ? 'pi pi-spin pi-spinner' : undefined}
                  outlined
                  size="small"
                  onClick={() => handleTestAlert(key)}
                  disabled={loading}
                  className={`shrink-0 ${colors.border} ${colors.text} ${colors.hover}`}
                />
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Recent Alerts */}
      <Panel header="Recent Alerts" icons={recentAlertsIcons} className="card-elevated">
        <ScrollPanel style={{ width: '100%', height: '340px' }}>
          <div className="flex flex-col gap-2">
            {recentAlerts.length === 0 ? (
              <EmptyState
                icon={<Bell size={36} className="text-muted-foreground" />}
                title="No recent alerts"
                description="Alerts will appear here when triggered"
              />
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-4 p-3.5 border border-transparent hover:border-border hover:bg-accent/50 transition-all duration-200 rounded-xl"
                >
                  <Tag
                    value={alert.type}
                    severity={getBadgeSeverity(alert.type) as any}
                    className={`gap-1.5 text-xs${getBadgeClass(alert.type) ? ` ${getBadgeClass(alert.type)}` : ''}`}
                    icon={getAlertIcon(alert.type)}
                    rounded
                  />

                  <span className="text-sm text-foreground flex-1 font-medium">
                    {alert.username}
                  </span>

                  {alert.amount && (
                    <Tag value={`$${alert.amount}`} className="text-xs worxed-badge-donation" rounded />
                  )}

                  {alert.message && (
                    <span className="text-xs text-muted-foreground max-w-50 truncate">
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
        </ScrollPanel>
      </Panel>
    </div>
  );
}
