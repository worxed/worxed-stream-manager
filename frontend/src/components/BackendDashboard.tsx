import { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Server,
  Cpu,
  Activity,
  Wifi,
  Clock,
  Play,
  Square,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, ScrollArea, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { socketService } from '../services/socket';

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'command';
}

interface Process {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  port: number;
  uptime: string;
  type: string;
}

interface Connection {
  id: string;
  ip: string;
  device: string;
  ping: string;
}

export default function BackendDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: '12:00:01', message: 'System initialized.', type: 'info' },
    { time: '12:00:05', message: 'Socket.IO Server started on port 4001', type: 'success' },
    { time: '12:15:22', message: 'New client connected: Dashboard_01', type: 'info' },
  ]);
  const [command, setCommand] = useState('');
  const [cpuLoad] = useState('18%');
  const [serverLatency] = useState('4ms');

  const [processes, setProcesses] = useState<Process[]>([
    { id: 'p1', name: 'Twitch Chat Client', status: 'running', port: 4001, uptime: '2h 14m', type: 'chat' },
    { id: 'p2', name: 'WebSocket Server', status: 'running', port: 4001, uptime: '2h 14m', type: 'socket' },
    { id: 'p3', name: 'API Server', status: 'running', port: 4001, uptime: '2h 14m', type: 'api' },
  ]);

  const [connections] = useState<Connection[]>([
    { id: 'c1', ip: '192.168.1.15', device: 'OBS Studio', ping: '12ms' },
    { id: 'c2', ip: '127.0.0.1', device: 'Dev Browser', ping: '2ms' },
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const unsubConnect = socketService.onConnect(() => {
      addLog('Client connected to backend', 'success');
    });

    const unsubDisconnect = socketService.onDisconnect(() => {
      addLog('Client disconnected from backend', 'warn');
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, message, type }]);
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    addLog(`> ${command}`, 'command');

    setTimeout(() => {
      if (command === 'clear') {
        setLogs([]);
      } else if (command === 'status') {
        addLog('System Status: All services operational', 'success');
      } else if (command.startsWith('restart')) {
        addLog('Restarting services...', 'info');
        setTimeout(() => addLog('Services restarted successfully', 'success'), 1000);
      } else {
        addLog(`Command processed: ${command}`, 'info');
      }
    }, 300);

    setCommand('');
  };

  const toggleProcess = (id: string) => {
    setProcesses(
      processes.map((p) =>
        p.id === id ? { ...p, status: p.status === 'running' ? 'stopped' : 'running' } : p
      )
    );
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-destructive';
      case 'warn':
        return 'text-warning';
      case 'command':
        return 'text-foreground font-bold';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <Card variant="stat" padding="sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">CPU Load</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{cpuLoad}</p>
          </CardContent>
        </Card>

        <Card variant="stat" padding="sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Wifi size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Active Clients</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{connections.length}</p>
          </CardContent>
        </Card>

        <Card variant="stat" padding="sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Processes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{processes.length}</p>
          </CardContent>
        </Card>

        <Card variant="stat" padding="sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Server Latency</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{serverLatency}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Process Manager */}
        <div className="md:col-span-4">
          <Card variant="elevated" className="h-[500px] flex flex-col">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-muted">
                  <Server size={16} className="text-muted-foreground" />
                </div>
                <CardTitle className="text-sm">Backend Processes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-3">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-3">
                  {processes.map((proc) => (
                    <div
                      key={proc.id}
                      className="p-4 bg-background border border-border rounded-xl transition-all duration-200 hover:border-input"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-2.5 h-2.5 rounded-full',
                              proc.status === 'running' && 'bg-success',
                              proc.status === 'error' && 'bg-destructive',
                              proc.status === 'stopped' && 'bg-muted-foreground'
                            )}
                          />
                          <span className="text-sm font-semibold text-foreground">{proc.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleProcess(proc.id)}
                          className={cn(
                            'p-1.5 h-auto rounded-lg',
                            proc.status === 'running'
                              ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                              : 'text-success hover:text-success hover:bg-success/10'
                          )}
                        >
                          {proc.status === 'running' ? <Square size={14} /> : <Play size={14} />}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        PORT: {proc.port} &middot; UP: {proc.uptime}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Terminal + Connections */}
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* Terminal */}
          <Card variant="elevated" className="h-[360px] flex flex-col bg-background">
            <CardHeader className="border-b border-border py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Terminal size={14} className="text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">worxed@backend</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-chart-5/50" />
                  <div className="w-3 h-3 rounded-full bg-chart-3/50" />
                  <div className="w-3 h-3 rounded-full bg-chart-2/50" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                <div className="flex flex-col gap-1.5">
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        [{log.time}]
                      </span>
                      <span className={cn('text-xs font-mono', getLogColor(log.type))}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            <form onSubmit={handleCommand}>
              <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
                <span className="text-sm font-bold text-foreground font-mono">$</span>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Type 'status', 'restart', or 'clear'..."
                  variant="unstyled"
                  className="flex-1 font-mono text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </form>
          </Card>

          {/* Connections */}
          <Card variant="elevated">
            <CardHeader className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-muted">
                  <Wifi size={16} className="text-muted-foreground" />
                </div>
                <CardTitle className="text-sm">Active WebSocket Connections</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="p-4 bg-background border border-border rounded-xl transition-all duration-200 hover:border-input"
                  >
                    <div className="flex items-center gap-5">
                      <span className="text-xs font-mono text-muted-foreground">{conn.ip}</span>
                      <span className="text-xs font-medium text-foreground">{conn.device}</span>
                      <span className="text-xs font-semibold text-success">{conn.ping}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
