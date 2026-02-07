import { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  Clock,
  Gamepad2,
  RefreshCw,
  Loader2,
  Radio,
  MessageSquare,
  Activity,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  ScrollArea,
  Tooltip,
  SkeletonStats,
  SkeletonList,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { socketService } from '../services/socket';
import { getStreamInfo, getAnalytics } from '../services/api';
import type { StreamData, ActivityItem, ChatMessage } from '../types';
import EventFeed from './EventFeed';

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
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadData();

    const unsubChat = socketService.onChatMessage((message) => {
      setRecentChat((prev) => [...prev.slice(-19), message]);
    });

    const unsubFollower = socketService.onNewFollower((data) => {
      setActivity((prev) => [{ ...data, type: 'follower' }, ...prev.slice(0, 19)]);
    });

    const unsubSub = socketService.onNewSubscriber((data) => {
      setActivity((prev) => [{ ...data, type: 'subscriber' }, ...prev.slice(0, 19)]);
    });

    const unsubRaid = socketService.onRaid((data) => {
      setActivity((prev) => [{ ...data, type: 'raid' }, ...prev.slice(0, 19)]);
    });

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

      if (streamResult.data) setStreamData(streamResult.data);

      if (analyticsResult.data) {
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
    setInitialLoad(false);
  };

  const getActivityBadgeVariant = (type: string) => {
    switch (type) {
      case 'follower': return 'follow';
      case 'subscriber': return 'subscribe';
      case 'raid': return 'raid';
      default: return 'outline';
    }
  };

  return (
    <div className="flex flex-col gap-8 items-center">
      {/* Stream Status Header */}
      <Card variant="elevated">
        <CardHeader border>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-3.5 h-3.5 rounded-full',
                streamData.isLive ? 'bg-chart-5 animate-pulse' : 'bg-muted-foreground'
              )} />
              <div>
                <CardTitle as="h2">Stream Status</CardTitle>
                <CardDescription>Real-time stream information</CardDescription>
              </div>
            </div>
            <Tooltip content="Refresh data">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          {initialLoad ? (
            <SkeletonStats count={4} />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Status */}
                <Card variant="stat" padding="sm">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Radio size={16} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">Status</span>
                    </div>
                    <Badge
                      variant={streamData.isLive ? 'live' : 'offline'}
                      className={cn('text-sm px-5 py-1.5', streamData.isLive && 'animate-pulse')}
                    >
                      {streamData.isLive ? 'Live' : 'Offline'}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Viewers */}
                <Card variant="stat" padding="sm">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye size={16} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">Viewers</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {streamData.viewers.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                {/* Followers */}
                <Card variant="stat" padding="sm">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={16} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">Followers</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {streamData.followers.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                {/* Uptime */}
                <Card variant="stat" padding="sm">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={16} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">Uptime</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {streamData.uptime}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Game & Title */}
              {streamData.title && (
                <Card variant="inset" padding="sm" className="mt-5">
                  <CardContent className="flex items-start gap-4 py-4">
                    <Gamepad2 size={20} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {streamData.game || 'Unknown Game'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{streamData.title}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity & Chat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card variant="elevated" className="flex flex-col">
          <CardHeader border>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-chart-2/10">
                <Activity size={18} className="text-chart-2" />
              </div>
              <div>
                <CardTitle as="h2">Recent Activity</CardTitle>
                <CardDescription>Follows, subscribes, and raids</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {initialLoad ? (
              <SkeletonList count={3} />
            ) : (
              <ScrollArea className="h-[280px]">
                {activity.length === 0 ? (
                  <EmptyState
                    icon={<Activity size={36} className="text-muted-foreground" />}
                    title="No recent activity"
                    description="Activity will appear here when viewers interact"
                  />
                ) : (
                  <div className="flex flex-col gap-1.5 pr-3">
                    {activity.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3.5 border border-transparent hover:border-border hover:bg-accent/50 transition-all duration-200 rounded-xl"
                      >
                        <Badge variant={getActivityBadgeVariant(item.type) as any} className="text-xs shrink-0">
                          {item.type}
                        </Badge>
                        <span className="text-sm font-medium text-foreground truncate">
                          {item.username}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Chat */}
        <Card variant="elevated" className="flex flex-col">
          <CardHeader border>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-chart-4/10">
                <MessageSquare size={18} className="text-chart-4" />
              </div>
              <div>
                <CardTitle as="h2">Recent Chat</CardTitle>
                <CardDescription>Live chat messages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {initialLoad ? (
              <SkeletonList count={3} />
            ) : (
              <ScrollArea className="h-[280px]">
                {recentChat.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare size={36} className="text-muted-foreground" />}
                    title="No messages yet"
                    description="Chat messages will appear here when viewers chat"
                  />
                ) : (
                  <div className="flex flex-col gap-1.5 pr-3">
                    {recentChat.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3.5 border border-transparent hover:border-border hover:bg-accent/50 transition-all duration-200 rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className="text-sm font-semibold shrink-0"
                            style={{ color: msg.color || undefined }}
                          >
                            {msg.username}:
                          </span>
                          <span className="text-sm text-foreground break-words">{msg.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom Events */}
      <EventFeed />
    </div>
  );
}

// Empty State Component
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <div className="mb-4 p-4 rounded-2xl bg-muted/50 opacity-60">{icon}</div>
      <p className="text-sm font-semibold text-muted-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground/60">{description}</p>
    </div>
  );
}
