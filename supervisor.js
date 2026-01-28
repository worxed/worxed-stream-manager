/**
 * WORXED STREAM MANAGER - Supervisor
 *
 * Lightweight process manager that controls the backend server.
 * Exposes REST API for status checks and restart commands.
 * Streams real-time logs via WebSocket.
 *
 * Ports:
 * - Supervisor API: 4000
 * - Backend (API + Admin UI): 4001 (spawned as child process)
 * - Frontend (Stream overlays): 5173 (Vite dev server)
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const { WebSocketServer } = require('ws');

const SUPERVISOR_PORT = process.env.SUPERVISOR_PORT || 4000;
const BACKEND_PATH = path.join(__dirname, 'backend', 'server.js');
const FRONTEND_PATH = path.join(__dirname, 'frontend');

// Track if we're shutting down to prevent respawns
let isShuttingDown = false;

let backendProcess = null;
let backendStatus = 'stopped';
let restartCount = 0;
let lastStartTime = null;

let frontendProcess = null;
let frontendStatus = 'stopped';
let frontendLastStartTime = null;

// WebSocket clients for log streaming
const wsClients = new Set();
const logBuffer = []; // Keep last 100 logs for new connections
const MAX_LOG_BUFFER = 100;

// ANSI colors for console output
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`${c.dim}[${timestamp}]${c.reset} ${c[color]}[SUPERVISOR]${c.reset} ${msg}`);
  broadcastLog('supervisor', msg, color);
}

// Broadcast log to all WebSocket clients
function broadcastLog(source, message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, source, message, type };

  // Add to buffer
  logBuffer.push(logEntry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }

  // Broadcast to all connected clients
  const payload = JSON.stringify({ type: 'log', data: logEntry });
  wsClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  });
}

function startBackend() {
  if (backendProcess) {
    log('Backend already running, stopping first...', 'yellow');
    stopBackend();
  }

  log('Starting backend server...', 'cyan');

  backendProcess = spawn('node', [BACKEND_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  backendStatus = 'starting';
  lastStartTime = new Date();

  backendProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      // Strip ANSI codes for clean log
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      console.log(`${c.dim}[BACKEND]${c.reset} ${line}`);
      broadcastLog('backend', cleanLine, 'info');
    });

    // Detect when backend is ready
    if (data.toString().includes('Server running on port')) {
      backendStatus = 'running';
      log('Backend is ready!', 'green');
    }
  });

  backendProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      console.log(`${c.red}[BACKEND ERROR]${c.reset} ${line}`);
      broadcastLog('backend', cleanLine, 'error');
    });
  });

  backendProcess.on('close', (code) => {
    log(`Backend exited with code ${code}`, code === 0 ? 'yellow' : 'red');
    backendProcess = null;
    backendStatus = 'stopped';
  });

  backendProcess.on('error', (err) => {
    log(`Failed to start backend: ${err.message}`, 'red');
    backendProcess = null;
    backendStatus = 'error';
  });
}

function stopBackend() {
  if (backendProcess) {
    log('Stopping backend...', 'yellow');

    // On Windows, we need to kill the process tree
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t'], { shell: true });
    } else {
      backendProcess.kill('SIGTERM');
    }

    backendProcess = null;
    backendStatus = 'stopped';
  }
}

function restartBackend() {
  restartCount++;
  log(`Restarting backend (restart #${restartCount})...`, 'cyan');
  stopBackend();
  setTimeout(startBackend, 500); // Small delay to ensure clean shutdown
}

// ===========================================
// FRONTEND PROCESS MANAGEMENT
// ===========================================
function startFrontend() {
  if (frontendProcess) {
    log('Frontend already running', 'yellow');
    return;
  }

  log('Starting frontend dev server...', 'cyan');

  // Use npm on Windows, npm on Linux/Mac
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  frontendProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: FRONTEND_PATH,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
    shell: isWindows,
  });

  frontendStatus = 'starting';
  frontendLastStartTime = new Date();

  frontendProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      console.log(`${c.green}[FRONTEND]${c.reset} ${line}`);
      broadcastLog('frontend', cleanLine, 'info');
    });

    if (data.toString().includes('Local:') || data.toString().includes('ready in')) {
      frontendStatus = 'running';
      log('Frontend is ready!', 'green');
    }
  });

  frontendProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      console.log(`${c.yellow}[FRONTEND]${c.reset} ${line}`);
      broadcastLog('frontend', cleanLine, 'warning');
    });
  });

  frontendProcess.on('close', (code) => {
    log(`Frontend exited with code ${code}`, code === 0 ? 'yellow' : 'red');
    frontendProcess = null;
    frontendStatus = 'stopped';
  });

  frontendProcess.on('error', (err) => {
    log(`Failed to start frontend: ${err.message}`, 'red');
    frontendProcess = null;
    frontendStatus = 'error';
  });
}

function stopFrontend() {
  if (frontendProcess) {
    log('Stopping frontend...', 'yellow');

    // On Windows, we need to kill the process tree
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', frontendProcess.pid, '/f', '/t'], { shell: true });
    } else {
      frontendProcess.kill('SIGTERM');
    }

    frontendProcess = null;
    frontendStatus = 'stopped';
  }
}

function restartFrontend() {
  log('Restarting frontend...', 'cyan');
  stopFrontend();
  setTimeout(startFrontend, 500);
}

function getStatus() {
  return {
    supervisor: 'running',
    supervisorPort: SUPERVISOR_PORT,
    backend: {
      status: backendStatus,
      pid: backendProcess?.pid || null,
      port: 4001,
      restartCount,
      lastStartTime: lastStartTime?.toISOString() || null,
      uptime: lastStartTime && backendStatus === 'running'
        ? Math.floor((Date.now() - lastStartTime) / 1000)
        : 0,
    },
    frontend: {
      status: frontendStatus,
      pid: frontendProcess?.pid || null,
      port: 5173,
      lastStartTime: frontendLastStartTime?.toISOString() || null,
      uptime: frontendLastStartTime && frontendStatus === 'running'
        ? Math.floor((Date.now() - frontendLastStartTime) / 1000)
        : 0,
    },
  };
}

// HTTP Server for supervisor API
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url;

  // GET /status - Get supervisor and backend status
  if (req.method === 'GET' && url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify(getStatus(), null, 2));
    return;
  }

  // POST /restart - Restart the backend
  if (req.method === 'POST' && url === '/restart') {
    restartBackend();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Backend restart initiated' }));
    return;
  }

  // POST /stop - Stop the backend
  if (req.method === 'POST' && url === '/stop') {
    stopBackend();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Backend stopped' }));
    return;
  }

  // POST /start - Start the backend
  if (req.method === 'POST' && url === '/start') {
    if (backendStatus === 'running') {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, message: 'Backend already running' }));
      return;
    }
    startBackend();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Backend start initiated' }));
    return;
  }

  // Frontend control endpoints
  if (req.method === 'POST' && url === '/frontend/start') {
    if (frontendStatus === 'running') {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, message: 'Frontend already running' }));
      return;
    }
    startFrontend();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Frontend start initiated' }));
    return;
  }

  if (req.method === 'POST' && url === '/frontend/stop') {
    stopFrontend();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Frontend stopped' }));
    return;
  }

  if (req.method === 'POST' && url === '/frontend/restart') {
    restartFrontend();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Frontend restart initiated' }));
    return;
  }

  // Start all services
  if (req.method === 'POST' && url === '/start-all') {
    if (backendStatus !== 'running') startBackend();
    setTimeout(() => {
      if (frontendStatus !== 'running') startFrontend();
    }, 1000);
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Starting all services' }));
    return;
  }

  // Stop all services
  if (req.method === 'POST' && url === '/stop-all') {
    stopFrontend();
    stopBackend();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Stopping all services' }));
    return;
  }

  // 404 for everything else
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Graceful shutdown - clean up all processes
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log(`Received ${signal}, shutting down gracefully...`, 'yellow');

  // Stop all child processes
  stopFrontend();
  stopBackend();

  // Close WebSocket connections
  wsClients.forEach(client => {
    try {
      client.close();
    } catch (e) {}
  });
  wsClients.clear();

  // Close HTTP server
  server.close(() => {
    log('All services stopped. Goodbye!', 'yellow');
    process.exit(0);
  });

  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    log('Forcing exit...', 'red');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle Windows Ctrl+C
if (process.platform === 'win32') {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`, 'red');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`, 'red');
});

// WebSocket server for log streaming
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  log('Log viewer connected', 'cyan');
  wsClients.add(ws);

  // Send current status
  ws.send(JSON.stringify({ type: 'status', data: getStatus() }));

  // Send log history
  ws.send(JSON.stringify({ type: 'history', data: logBuffer }));

  ws.on('close', () => {
    wsClients.delete(ws);
    log('Log viewer disconnected', 'yellow');
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    wsClients.delete(ws);
  });
});

// Start everything
server.listen(SUPERVISOR_PORT, () => {
  console.log('');
  console.log(`${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}     ${c.green}WORXED SUPERVISOR${c.reset}                                     ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╠════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Supervisor:  http://localhost:${SUPERVISOR_PORT}                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Admin:       http://localhost:4001                        ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Frontend:    http://localhost:5173                        ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╠════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Backend:  /start, /stop, /restart                         ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Frontend: /frontend/start, /frontend/stop                 ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  All:      /start-all, /stop-all                           ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╠════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Press Ctrl+C to stop all services                         ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╚════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log('');

  // Auto-start backend and frontend
  startBackend();
  setTimeout(() => {
    startFrontend();
  }, 2000); // Give backend a head start
});
