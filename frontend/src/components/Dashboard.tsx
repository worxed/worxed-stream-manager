import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  ScrollArea,
  Box,
} from '@mantine/core';
import {
  IconUsers,
  IconEye,
  IconClock,
  IconDeviceGamepad2,
  IconRefresh,
  IconBell,
  IconMessage,
} from '@tabler/icons-react';
import { socketService } from '../services/socket';
import { getStreamInfo, getAnalytics } from '../services/api';
import type { StreamData, ActivityItem, ChatMessage } from '../types';

export default function Dashboard() {
  const [streamData, setStreamData] = useState<StreamData>({
    isLive: false,
    title: 'Loading...',
    game: '',
    viewers: 0,
    followers: 0,
    uptime: '00:00:00',
    startedAt: null,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [recentChat, setRecentChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();

    // Socket event subscriptions
    const unsubChat = socketService.onChatMessage((message) => {
      setRecentChat((prev) => [...prev.slice(-19), message]);
    });

    const unsubFollower = socketService.onNewFollower((data) => {
      setActivity((prev) => [
        { ...data, type: 'follower' },
        ...prev.slice(0, 19),
      ]);
    });

    const unsubSub = socketService.onNewSubscriber((data) => {
      setActivity((prev) => [
        { ...data, type: 'subscriber' },
        ...prev.slice(0, 19),
      ]);
    });

    const unsubRaid = socketService.onRaid((data) => {
      setActivity((prev) => [
        { ...data, type: 'raid' },
        ...prev.slice(0, 19),
      ]);
    });

    // Refresh stream data periodically
    const interval = setInterval(loadData, 60000);

    return () => {
      unsubChat();
      unsubFollower();
      unsubSub();
      unsubRaid();
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [streamResult, analyticsResult] = await Promise.all([
        getStreamInfo(),
        getAnalytics(),
      ]);

      if (streamResult.data) {
        setStreamData(streamResult.data);
      }

      if (analyticsResult.data) {
        // Build activity from analytics
        const activities: ActivityItem[] = [];
        analyticsResult.data.followers.recent?.forEach((f) => {
          activities.push({
            id: f.followed_at,
            type: 'follower',
            username: f.user_name,
            timestamp: f.followed_at,
          });
        });
        setActivity(activities);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const testAlert = (type: string) => {
    socketService.testAlert(type, `TestUser${Math.floor(Math.random() * 1000)}`);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'follower':
        return <IconUsers size={14} />;
      case 'subscriber':
        return <IconBell size={14} />;
      case 'raid':
        return <IconUsers size={14} />;
      default:
        return <IconMessage size={14} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'follower':
        return 'grape';
      case 'subscriber':
        return 'green';
      case 'raid':
        return 'blue';
      default:
        return 'gray';
    }
  };

  return (
    <Stack gap="md">
      {/* Stream Status */}
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
            STREAM STATUS
          </Text>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={loadData}
            loading={loading}
            styles={{
              root: {
                fontFamily: '"VT323", monospace',
                color: 'var(--text-muted)',
              },
            }}
          >
            REFRESH
          </Button>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 6, md: 3 }}>
            <Box
              style={{
                padding: '16px',
                background: 'var(--primary-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <Text
                size="xs"
                style={{ color: 'var(--text-muted)', marginBottom: '8px' }}
              >
                STATUS
              </Text>
              <Badge
                color={streamData.isLive ? 'red' : 'gray'}
                variant="filled"
                size="lg"
                className={streamData.isLive ? 'status-live' : ''}
              >
                {streamData.isLive ? 'LIVE' : 'OFFLINE'}
              </Badge>
            </Box>
          </Grid.Col>

          <Grid.Col span={{ base: 6, md: 3 }}>
            <Box
              style={{
                padding: '16px',
                background: 'var(--primary-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <Text
                size="xs"
                style={{ color: 'var(--text-muted)', marginBottom: '8px' }}
              >
                <IconEye size={12} style={{ marginRight: '4px' }} />
                VIEWERS
              </Text>
              <Text
                size="xl"
                style={{
                  fontFamily: '"VT323", monospace',
                  color: 'var(--primary-green)',
                }}
              >
                {streamData.viewers.toLocaleString()}
              </Text>
            </Box>
          </Grid.Col>

          <Grid.Col span={{ base: 6, md: 3 }}>
            <Box
              style={{
                padding: '16px',
                background: 'var(--primary-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <Text
                size="xs"
                style={{ color: 'var(--text-muted)', marginBottom: '8px' }}
              >
                <IconUsers size={12} style={{ marginRight: '4px' }} />
                FOLLOWERS
              </Text>
              <Text
                size="xl"
                style={{
                  fontFamily: '"VT323", monospace',
                  color: 'var(--primary-green)',
                }}
              >
                {streamData.followers.toLocaleString()}
              </Text>
            </Box>
          </Grid.Col>

          <Grid.Col span={{ base: 6, md: 3 }}>
            <Box
              style={{
                padding: '16px',
                background: 'var(--primary-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <Text
                size="xs"
                style={{ color: 'var(--text-muted)', marginBottom: '8px' }}
              >
                <IconClock size={12} style={{ marginRight: '4px' }} />
                UPTIME
              </Text>
              <Text
                size="xl"
                style={{
                  fontFamily: '"VT323", monospace',
                  color: 'var(--primary-green)',
                }}
              >
                {streamData.uptime}
              </Text>
            </Box>
          </Grid.Col>
        </Grid>

        {streamData.title && (
          <Box mt="md">
            <Group gap="xs">
              <IconDeviceGamepad2 size={14} style={{ color: 'var(--secondary-purple)' }} />
              <Text size="sm" style={{ color: 'var(--secondary-purple)' }}>
                {streamData.game || 'Unknown Game'}
              </Text>
            </Group>
            <Text size="sm" mt="xs" style={{ color: 'var(--text-muted)' }}>
              {streamData.title}
            </Text>
          </Box>
        )}
      </Card>

      {/* Quick Actions */}
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
          QUICK ACTIONS
        </Text>

        <Group>
          <Button
            variant="outline"
            color="grape"
            onClick={() => testAlert('follow')}
            styles={{
              root: {
                fontFamily: '"VT323", monospace',
                letterSpacing: '1px',
              },
            }}
          >
            TEST FOLLOW
          </Button>
          <Button
            variant="outline"
            color="green"
            onClick={() => testAlert('subscribe')}
            styles={{
              root: {
                fontFamily: '"VT323", monospace',
                letterSpacing: '1px',
              },
            }}
          >
            TEST SUB
          </Button>
          <Button
            variant="outline"
            color="yellow"
            onClick={() => testAlert('donation')}
            styles={{
              root: {
                fontFamily: '"VT323", monospace',
                letterSpacing: '1px',
              },
            }}
          >
            TEST DONATION
          </Button>
          <Button
            variant="outline"
            color="blue"
            onClick={() => testAlert('raid')}
            styles={{
              root: {
                fontFamily: '"VT323", monospace',
                letterSpacing: '1px',
              },
            }}
          >
            TEST RAID
          </Button>
        </Group>
      </Card>

      {/* Activity & Chat */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            padding="lg"
            radius="md"
            h={300}
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
              RECENT ACTIVITY
            </Text>

            <ScrollArea h={200}>
              <Stack gap="xs">
                {activity.length === 0 ? (
                  <Text size="sm" style={{ color: 'var(--text-muted)' }}>
                    No recent activity
                  </Text>
                ) : (
                  activity.map((item) => (
                    <Group
                      key={item.id}
                      gap="sm"
                      p="xs"
                      style={{
                        background: 'var(--primary-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                      }}
                    >
                      <Badge
                        size="xs"
                        color={getActivityColor(item.type)}
                        variant="light"
                        leftSection={getActivityIcon(item.type)}
                      >
                        {item.type.toUpperCase()}
                      </Badge>
                      <Text size="sm" style={{ color: 'var(--secondary-purple)' }}>
                        {item.username}
                      </Text>
                      <Text
                        size="xs"
                        style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}
                      >
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </Text>
                    </Group>
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            padding="lg"
            radius="md"
            h={300}
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
              RECENT CHAT
            </Text>

            <ScrollArea h={200}>
              <Stack gap="xs">
                {recentChat.length === 0 ? (
                  <Text size="sm" style={{ color: 'var(--text-muted)' }}>
                    No recent messages
                  </Text>
                ) : (
                  recentChat.map((msg) => (
                    <Box
                      key={msg.id}
                      p="xs"
                      style={{
                        background: 'var(--primary-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                      }}
                    >
                      <Group gap="xs">
                        <Text
                          size="sm"
                          fw={500}
                          style={{ color: msg.color || 'var(--secondary-purple)' }}
                        >
                          {msg.username}:
                        </Text>
                        <Text size="sm" style={{ color: 'var(--text-primary)' }}>
                          {msg.message}
                        </Text>
                      </Group>
                    </Box>
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
