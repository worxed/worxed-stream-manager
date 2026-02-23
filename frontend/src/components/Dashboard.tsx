import { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  Clock,
  Gamepad2,
  Radio,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { Card } from 'primereact/card';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ScrollPanel } from 'primereact/scrollpanel';
import { Skeleton } from 'primereact/skeleton';
import { socketService } from '../services/socket';
import { getStreamInfo, getAnalytics } from '../services/api';
import type { StreamData, ActivityItem, ChatMessage } from '../types';
import EventFeed from './EventFeed';
import EmptyState from './common/EmptyState';

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

  const getActivityBadgeSeverity = (type: string) => {
    switch (type) {
      case 'follower': return 'info';
      case 'subscriber': return 'success';
      case 'raid': return 'warning';
      default: return 'secondary';
    }
  };

  const getActivityBadgeClass = (type: string) => {
    switch (type) {
      case 'follower': return 'worxed-badge-follow';
      case 'subscriber': return '';
      case 'raid': return '';
      default: return '';
    }
  };

  const streamStatusHeader = (
    <div className="flex items-center gap-4">
      <div className={`w-3.5 h-3.5 rounded-full${streamData.isLive ? ' bg-chart-5 animate-pulse' : ' bg-muted-foreground'}`} />
      <div>
        <h2 className="text-lg font-semibold text-foreground">Stream Status</h2>
        <p className="text-sm text-muted-foreground">Real-time stream information</p>
      </div>
    </div>
  );

  const streamStatusIcons = (
    <Button
      icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
      severity="secondary"
      outlined
      size="small"
      onClick={loadData}
      disabled={loading}
      tooltip="Refresh data"
      tooltipOptions={{ position: 'top' }}
    />
  );

  const activityHeader = (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-muted/50">
        <Activity size={18} className="text-chart-2" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">Follows, subscribes, and raids</p>
      </div>
    </div>
  );

  const chatHeader = (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-muted/50">
        <MessageSquare size={18} className="text-chart-4" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Recent Chat</h2>
        <p className="text-sm text-muted-foreground">Live chat messages</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Stream Status Header */}
      <Panel header={streamStatusHeader} icons={streamStatusIcons} className="card-elevated">
        {initialLoad ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton width="60%" height="1rem" className="mb-3" />
                <Skeleton width="40%" height="2rem" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Status */}
              <Card className="card-stat">
                <div className="flex items-center gap-2 mb-3">
                  <Radio size={16} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Status</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  <Tag
                    value={streamData.isLive ? 'Live' : 'Offline'}
                    className={streamData.isLive ? 'worxed-badge-live' : 'worxed-badge-offline'}
                    rounded
                  />
                </div>
              </Card>

              {/* Viewers */}
              <Card className="card-stat">
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={16} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Viewers</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{streamData.viewers.toLocaleString()}</div>
              </Card>

              {/* Followers */}
              <Card className="card-stat">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Followers</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{streamData.followers.toLocaleString()}</div>
              </Card>

              {/* Uptime */}
              <Card className="card-stat">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Uptime</span>
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{streamData.uptime}</div>
              </Card>
            </div>

            {/* Game & Title */}
            {streamData.title && (
              <Card className="card-inset mt-4">
                <div className="flex items-start gap-4">
                  <Gamepad2 size={20} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {streamData.game || 'Unknown Game'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{streamData.title}</p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </Panel>

      {/* Activity & Chat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Recent Activity */}
        <Panel header={activityHeader} className="card-elevated flex flex-col">
          {initialLoad ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton width="4rem" height="1.5rem" borderRadius="9999px" />
                  <Skeleton width="60%" height="1rem" />
                </div>
              ))}
            </div>
          ) : (
            <ScrollPanel style={{ width: '100%', height: '280px' }}>
              {activity.length === 0 ? (
                <EmptyState
                  icon={<Activity size={36} className="text-muted-foreground" />}
                  title="No recent activity"
                  description="Activity will appear here when viewers interact"
                />
              ) : (
                <div className="flex flex-col gap-2 pr-3">
                  {activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3.5 border border-transparent hover:border-border hover:bg-accent/50 transition-all duration-200 rounded-xl"
                    >
                      <Tag
                        value={item.type}
                        severity={getActivityBadgeSeverity(item.type) as any}
                        className={`text-xs shrink-0${getActivityBadgeClass(item.type) ? ` ${getActivityBadgeClass(item.type)}` : ''}`}
                        rounded
                      />
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
            </ScrollPanel>
          )}
        </Panel>

        {/* Recent Chat */}
        <Panel header={chatHeader} className="card-elevated flex flex-col">
          {initialLoad ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton width="5rem" height="1rem" />
                  <Skeleton width="70%" height="1rem" />
                </div>
              ))}
            </div>
          ) : (
            <ScrollPanel style={{ width: '100%', height: '280px' }}>
              {recentChat.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare size={36} className="text-muted-foreground" />}
                  title="No messages yet"
                  description="Chat messages will appear here when viewers chat"
                />
              ) : (
                <div className="flex flex-col gap-2 pr-3">
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
                        <span className="text-sm text-foreground wrap-break-word">{msg.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollPanel>
          )}
        </Panel>
      </div>

      {/* Custom Events */}
      <EventFeed />
    </div>
  );
}
