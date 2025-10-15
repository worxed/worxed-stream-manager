import { 
  Grid, 
  Card, 
  Text, 
  Button, 
  Badge,
  Group,
  Stack,
  Indicator,
  useMantineTheme,
  ActionIcon,
  ScrollArea,
  Switch,
  Divider,
  Paper,
  Container
} from '@mantine/core';
import { 
  IconBrandTwitch, 
  IconUsers, 
  IconHeart,
  IconWifi,
  IconWifiOff,
  IconTestPipe,
  IconClock,
  IconMessage
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import socketService, { 
  type StreamData, 
  type ActivityItem, 
  type AlertSettings,
  type ChatMessage 
} from '../services/SocketIOService';

export default function Dashboard() {
  const theme = useMantineTheme();
  
  // Real-time data from WebSocket service
  const [streamData, setStreamData] = useState<StreamData>({
    status: 'OFFLINE',
    viewers: 0,
    followers: 0,
    uptime: '00:00:00',
    title: 'Loading...',
    game: 'Loading...'
  });
  
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    follow: { enabled: true, sound: true, duration: 5000 },
    subscribe: { enabled: true, sound: true, duration: 7000 },
    donation: { enabled: true, sound: true, duration: 10000 },
    raid: { enabled: false, sound: false, duration: 8000 }
  });
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Socket.IO connections
  useEffect(() => {
    console.log('🔧 Dashboard: Setting up Socket.IO event listeners...');
    console.log('🔍 Socket.IO Status - Socket available:', socketService.isSocketAvailable());
    console.log('🔍 Socket.IO Status - Socket instance:', socketService.getSocket());
    console.log('🔍 Socket.IO Status - Connected:', socketService.getConnectionStatus());
    
    // Connect to Socket.IO if not already connected
    if (!socketService.getConnectionStatus() && !socketService.isSocketAvailable()) {
      console.log('🚀 Dashboard: Initiating Socket.IO connection...');
      socketService.connect();
    }
    
    // Set up event listeners
    socketService.onStreamData((data) => {
      console.log('📊 Dashboard: Received stream data:', data);
      setStreamData(data);
    });

    socketService.onActivity((activity) => {
      console.log('📈 Dashboard: Received initial activity list:', activity);
      setRecentActivity(activity);
    });

    socketService.onNewActivityItem((newActivity) => {
      console.log('🆕 Dashboard: Received new activity item:', newActivity);
      setRecentActivity(prev => {
        // Add new activity to the beginning and limit to 10 items
        const updated = [newActivity, ...prev].slice(0, 10);
        return updated;
      });
    });

    socketService.onAlertSettings((settings) => {
      console.log('🔔 Dashboard: Received alert settings:', settings);
      setAlertSettings(settings);
    });

    socketService.onConnection((connected) => {
      console.log('🔌 Dashboard: Connection status changed:', connected);
      setIsConnected(connected);
    });

    socketService.onChat((message: ChatMessage) => {
      notifications.show({
        title: `${message.username}:`,
        message: message.message,
        color: 'blue',
      });
    });

    return () => {
      console.log('🧹 Dashboard: Cleaning up Socket.IO listeners...');
      // Don't disconnect the socket entirely in development, just clear the listeners
      // This prevents issues with React strict mode double-mounting
      socketService.clearListeners();
    };
  }, []);

  const handleTestAlert = (type: 'follow' | 'subscribe' | 'donation' | 'raid') => {
    if (socketService.getConnectionStatus()) {
      // Use backend test if connected
      socketService.testAlert(type, `TestUser${Math.floor(Math.random() * 1000)}`);
    } else {
      // Use local test if not connected to backend
      const activityType = type === 'follow' ? 'follower' : type;
      socketService.testLocalActivity(activityType as 'follower' | 'subscribe' | 'donation' | 'raid');
    }
  };

  const handleTestChat = () => {
    socketService.testChat(
      'TestUser',
      'This is a test chat message! 🎮',
      '#8cffbe'
    );
  };

  const handleToggleAlert = (type: 'follow' | 'subscribe' | 'donation' | 'raid') => {
    // Mock alert settings toggle for now (backend doesn't have this endpoint yet)
    setAlertSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled
      }
    }));
    
    notifications.show({
      title: 'Alert Setting Updated',
      message: `${type} alerts ${alertSettings[type].enabled ? 'disabled' : 'enabled'}`,
      color: alertSettings[type].enabled ? 'red' : 'green',
    });
  };

  const ConnectionIcon = isConnected ? IconWifi : IconWifiOff;

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconBrandTwitch size={32} color={theme.colors.violet[6]} />
            <Text size="xl" fw={700}>Worxed Stream Manager</Text>
          </Group>
          
          <Group>
            <Indicator color={isConnected ? 'green' : 'red'} processing={!isConnected}>
              <ActionIcon variant="light" size="lg">
                <ConnectionIcon size={20} />
              </ActionIcon>
            </Indicator>
            <Badge color={isConnected ? 'green' : 'red'} variant="light">
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </Group>
        </Group>

        <Grid>
          {/* Stream Status Card */}
          <Grid.Col span={12}>
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Text fw={600}>Stream Status</Text>
                <Badge 
                  color={streamData.status === 'ONLINE' ? 'green' : 'gray'} 
                  variant="filled"
                >
                  {streamData.status}
                </Badge>
              </Group>
              
              <Text size="lg" mb="xs">{streamData.title}</Text>
              <Text size="sm" c="dimmed" mb="lg">{streamData.game}</Text>

              <Grid>
                <Grid.Col span={4}>
                  <Group>
                    <IconUsers size={20} />
                    <Stack gap={0}>
                      <Text size="lg" fw={700}>{streamData.viewers.toLocaleString()}</Text>
                      <Text size="xs" c="dimmed">Viewers</Text>
                    </Stack>
                  </Group>
                </Grid.Col>
                
                <Grid.Col span={4}>
                  <Group>
                    <IconHeart size={20} />
                    <Stack gap={0}>
                      <Text size="lg" fw={700}>{streamData.followers.toLocaleString()}</Text>
                      <Text size="xs" c="dimmed">Followers</Text>
                    </Stack>
                  </Group>
                </Grid.Col>
                
                <Grid.Col span={4}>
                  <Group>
                    <IconClock size={20} />
                    <Stack gap={0}>
                      <Text size="lg" fw={700}>{streamData.uptime}</Text>
                      <Text size="xs" c="dimmed">Uptime</Text>
                    </Stack>
                  </Group>
                </Grid.Col>
              </Grid>
            </Card>
          </Grid.Col>

          {/* Alert Controls */}
          <Grid.Col span={6}>
            <Card withBorder h="100%">
              <Text fw={600} mb="md">Alert Controls</Text>
              
              <Stack gap="sm">
                {Object.entries(alertSettings).map(([type, settings]) => (
                  <Group key={type} justify="space-between">
                    <Group>
                      <Switch
                        checked={settings.enabled}
                        onChange={() => handleToggleAlert(type as 'follow' | 'subscribe' | 'donation' | 'raid')}
                        color={settings.enabled ? 'green' : 'red'}
                      />
                      <Text tt="capitalize">{type}</Text>
                    </Group>
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconTestPipe size={14} />}
                      onClick={() => handleTestAlert(type as 'follow' | 'subscribe' | 'donation' | 'raid')}
                    >
                      Test
                    </Button>
                  </Group>
                ))}
              </Stack>

              <Divider my="md" />

              <Button
                fullWidth
                leftSection={<IconMessage size={16} />}
                onClick={handleTestChat}
                variant="outline"
              >
                Test Chat Message
              </Button>
            </Card>
          </Grid.Col>

          {/* Recent Activity */}
          <Grid.Col span={6}>
            <Card withBorder h="100%">
              <Text fw={600} mb="md">Recent Activity</Text>
              
              <ScrollArea h={200}>
                <Stack gap="xs">
                  {recentActivity.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center">No recent activity</Text>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <Paper key={index} p="xs" withBorder>
                        <Group justify="space-between">
                          <Stack gap={2}>
                            <Group gap="xs">
                              <Badge 
                                size="xs" 
                                color={getActivityColor(activity.type)}
                                variant="light"
                              >
                                {activity.type}
                              </Badge>
                              <Text size="sm" fw={500}>{activity.user}</Text>
                            </Group>
                            <Text size="xs" c="dimmed">{activity.message}</Text>
                          </Stack>
                          <Text size="xs" c="dimmed">{activity.time}</Text>
                        </Group>
                      </Paper>
                    ))
                  )}
                </Stack>
              </ScrollArea>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

function getActivityColor(type: string): string {
  switch (type) {
    case 'follower': return 'purple';
    case 'subscribe': return 'green';
    case 'donation': return 'yellow';
    case 'chat': return 'blue';
    case 'raid': return 'red';
    default: return 'gray';
  }
}