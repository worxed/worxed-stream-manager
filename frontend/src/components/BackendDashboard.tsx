import { useState, useEffect, useRef } from 'react';
import {
  Stack,
  Grid,
  Card,
  Text,
  Group,
  Badge,
  Button,
  ScrollArea,
  Box,
  TextInput,
} from '@mantine/core';
import {
  IconTerminal,
  IconServer,
  IconCpu,
  IconActivity,
  IconWifi,
  IconClock,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
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
    { time: '12:00:05', message: 'Socket.IO Server started on port 3001', type: 'success' },
    { time: '12:15:22', message: 'New client connected: Dashboard_01', type: 'info' },
  ]);
  const [command, setCommand] = useState('');
  const [cpuLoad, setCpuLoad] = useState('18%');
  const [serverLatency, setServerLatency] = useState('4ms');
  
  const [processes, setProcesses] = useState<Process[]>([
    { id: 'p1', name: 'Twitch Chat Client', status: 'running', port: 3001, uptime: '2h 14m', type: 'chat' },
    { id: 'p2', name: 'WebSocket Server', status: 'running', port: 3001, uptime: '2h 14m', type: 'socket' },
    { id: 'p3', name: 'API Server', status: 'running', port: 3001, uptime: '2h 14m', type: 'api' },
  ]);

  const [connections, setConnections] = useState<Connection[]>([
    { id: 'c1', ip: '192.168.1.15', device: 'OBS Studio', ping: '12ms' },
    { id: 'c2', ip: '127.0.0.1', device: 'Dev Browser', ping: '2ms' },
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    // Listen for backend events
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
    setLogs(prev => [...prev, { time, message, type }]);
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
    setProcesses(processes.map(p => 
      p.id === id 
        ? { ...p, status: p.status === 'running' ? 'stopped' : 'running' }
        : p
    ));
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'var(--electric-cyan)';
      case 'error': return 'var(--fire-red)';
      case 'warn': return '#FFCC00';
      case 'command': return 'white';
      default: return 'var(--text-muted)';
    }
  };

  const StatCard = ({ label, value, color, icon: Icon }: any) => (
    <Card
      p="md"
      radius="md"
      style={{
        backgroundColor: 'rgba(255, 45, 85, 0.05)',
        border: '1px solid rgba(255, 45, 85, 0.2)',
      }}
    >
      <Group gap="xs" mb="xs">
        <Icon size={14} style={{ color }} />
        <Text
          size="10px"
          tt="uppercase"
          fw={700}
          style={{ color: 'var(--text-muted)', letterSpacing: '1px' }}
        >
          {label}
        </Text>
      </Group>
      <Text
        size="xl"
        fw={500}
        style={{ fontFamily: 'monospace', color: 'white' }}
      >
        {value}
      </Text>
    </Card>
  );

  return (
    <Stack gap="md" p="md">
      {/* Top Stats */}
      <Grid>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <StatCard label="CPU Load" value={cpuLoad} color="var(--fire-red)" icon={IconCpu} />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <StatCard label="Active Clients" value={connections.length} color="var(--electric-cyan)" icon={IconWifi} />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <StatCard label="Processes" value={processes.length} color="var(--fire-red)" icon={IconActivity} />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <StatCard label="Server Latency" value={serverLatency} color="var(--electric-cyan)" icon={IconClock} />
        </Grid.Col>
      </Grid>

      <Grid>
        {/* Process Manager */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card
            p={0}
            radius="md"
            style={{
              backgroundColor: 'rgba(255, 45, 85, 0.08)',
              border: '1px solid rgba(255, 45, 85, 0.3)',
              height: '500px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Group
              p="md"
              justify="space-between"
              style={{ borderBottom: '1px solid rgba(255, 45, 85, 0.2)' }}
            >
              <Group gap="xs">
                <IconServer size={16} style={{ color: 'var(--fire-red)' }} />
                <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '1px' }}>
                  Backend Processes
                </Text>
              </Group>
            </Group>
            
            <ScrollArea style={{ flex: 1 }} p="sm">
              <Stack gap="xs">
                {processes.map(proc => (
                  <Box
                    key={proc.id}
                    p="md"
                    style={{
                      backgroundColor: 'var(--primary-bg)',
                      border: '1px solid rgba(255, 45, 85, 0.2)',
                      borderRadius: '8px',
                    }}
                  >
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Box
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor:
                              proc.status === 'running'
                                ? 'var(--electric-cyan)'
                                : proc.status === 'error'
                                ? 'var(--fire-red)'
                                : 'var(--cool-slate)',
                          }}
                        />
                        <Text size="sm" fw={500}>{proc.name}</Text>
                      </Group>
                      <Group gap={4}>
                        <Button
                          size="xs"
                          variant="subtle"
                          color={proc.status === 'running' ? 'red' : 'cyan'}
                          onClick={() => toggleProcess(proc.id)}
                          p={4}
                        >
                          {proc.status === 'running' ? (
                            <IconPlayerStop size={14} />
                          ) : (
                            <IconPlayerPlay size={14} />
                          )}
                        </Button>
                      </Group>
                    </Group>
                    <Text size="10px" c="dimmed" style={{ fontFamily: 'monospace' }}>
                      PORT: {proc.port} • UP: {proc.uptime}
                    </Text>
                  </Box>
                ))}
              </Stack>
            </ScrollArea>
          </Card>
        </Grid.Col>

        {/* Terminal + Connections */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            {/* Terminal */}
            <Card
              p={0}
              radius="md"
              style={{
                backgroundColor: '#000000',
                border: '1px solid rgba(255, 45, 85, 0.3)',
                height: '360px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Group
                p="sm"
                justify="space-between"
                style={{
                  backgroundColor: 'rgba(255, 45, 85, 0.05)',
                  borderBottom: '1px solid rgba(255, 45, 85, 0.2)',
                }}
              >
                <Group gap="xs">
                  <IconTerminal size={14} style={{ color: 'var(--fire-red)' }} />
                  <Text size="xs" style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    worxed@backend
                  </Text>
                </Group>
                <Group gap={4}>
                  <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: 'rgba(255, 45, 85, 0.5)' }} />
                  <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: 'rgba(255, 204, 0, 0.5)' }} />
                  <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: 'rgba(0, 251, 255, 0.5)' }} />
                </Group>
              </Group>

              <ScrollArea style={{ flex: 1 }} p="md">
                <Stack gap={4}>
                  {logs.map((log, i) => (
                    <Group key={i} gap="md" wrap="nowrap">
                      <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', flexShrink: 0 }}>
                        [{log.time}]
                      </Text>
                      <Text
                        size="xs"
                        style={{
                          fontFamily: 'monospace',
                          color: getLogColor(log.type),
                          fontWeight: log.type === 'command' ? 700 : 400,
                        }}
                      >
                        {log.message}
                      </Text>
                    </Group>
                  ))}
                  <div ref={logEndRef} />
                </Stack>
              </ScrollArea>

              <form onSubmit={handleCommand}>
                <Group
                  gap="xs"
                  p="sm"
                  style={{
                    backgroundColor: 'rgba(255, 45, 85, 0.05)',
                    borderTop: '1px solid rgba(255, 45, 85, 0.2)',
                  }}
                >
                  <Text
                    size="sm"
                    fw={700}
                    style={{ color: 'var(--fire-red)', fontFamily: 'monospace' }}
                  >
                    $
                  </Text>
                  <TextInput
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Type 'status', 'restart', or 'clear'..."
                    variant="unstyled"
                    size="sm"
                    style={{ flex: 1, fontFamily: 'monospace', color: 'white' }}
                    styles={{
                      input: {
                        color: 'white',
                        backgroundColor: 'transparent',
                        fontFamily: 'monospace',
                      },
                    }}
                  />
                </Group>
              </form>
            </Card>

            {/* Connections */}
            <Card
              p="md"
              radius="md"
              style={{
                backgroundColor: 'rgba(255, 45, 85, 0.08)',
                border: '1px solid rgba(255, 45, 85, 0.3)',
              }}
            >
              <Group mb="sm" gap="xs">
                <IconWifi size={16} style={{ color: 'var(--electric-cyan)' }} />
                <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '1px' }}>
                  Active WebSocket Connections
                </Text>
              </Group>
              <Group gap="md">
                {connections.map(conn => (
                  <Box
                    key={conn.id}
                    p="sm"
                    style={{
                      backgroundColor: 'var(--primary-bg)',
                      border: '1px solid rgba(255, 45, 85, 0.2)',
                      borderRadius: '6px',
                    }}
                  >
                    <Group gap="md">
                      <Text size="xs" style={{ fontFamily: 'monospace', color: 'var(--fire-red)' }}>
                        {conn.ip}
                      </Text>
                      <Text size="xs">{conn.device}</Text>
                      <Text size="xs" fw={700} style={{ color: 'var(--electric-cyan)' }}>
                        {conn.ping}
                      </Text>
                    </Group>
                  </Box>
                ))}
              </Group>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
