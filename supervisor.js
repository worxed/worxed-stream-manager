/**
 * WORXED STREAM MANAGER - Supervisor
 *
 * Process manager + admin UI host. Controls backend and frontend services.
 * Serves the Vue admin console, proxies /api/* to backend.
 * Exposes REST API for process control. Streams logs via WebSocket.
 *
 * Ports:
 * - Supervisor + Admin UI: 4000
 * - Backend (API only): 4001 (spawned as child process)
 * - Frontend (Stream overlays): 5173 (Vite dev server)
 */

const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const { WebSocketServer } = require('ws');
const db = require('./shared');

const ADMIN_DIR = path.join(__dirname, 'backend', 'public');
const BACKEND_PORT = 4001;

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

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

// ===========================================
// PROXY: Forward /api/* requests to backend
// ===========================================
function proxyToBackend(req, res) {
  const options = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${BACKEND_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backend unreachable', message: err.message }));
  });

  req.pipe(proxyReq);
}

// ===========================================
// STATIC FILE SERVER: Serve admin UI
// ===========================================
function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ADMIN_DIR, urlPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(ADMIN_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for any non-file route
      const indexPath = path.join(ADMIN_DIR, 'index.html');
      fs.readFile(indexPath, (err2, indexData) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Admin UI not built',
            hint: 'Run "npm run build:admin" from the root directory'
          }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexData);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ===========================================
// HTTP SERVER
// ===========================================
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // --- Proxy /api/* to backend ---
  if (url.startsWith('/api/')) {
    proxyToBackend(req, res);
    return;
  }

  // --- Proxy /webhooks/* to backend ---
  if (url.startsWith('/webhooks/')) {
    proxyToBackend(req, res);
    return;
  }

  // --- Supervisor API routes (JSON responses) ---
  res.setHeader('Content-Type', 'application/json');

  // GET /status
  if (req.method === 'GET' && url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify(getStatus(), null, 2));
    return;
  }

  // POST /restart
  if (req.method === 'POST' && url === '/restart') {
    restartBackend();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Backend restart initiated' }));
    return;
  }

  // POST /stop
  if (req.method === 'POST' && url === '/stop') {
    stopBackend();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Backend stopped' }));
    return;
  }

  // POST /start
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

  // Frontend control
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

  // Start/stop all
  if (req.method === 'POST' && url === '/start-all') {
    if (backendStatus !== 'running') startBackend();
    setTimeout(() => {
      if (frontendStatus !== 'running') startFrontend();
    }, 1000);
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Starting all services' }));
    return;
  }

  if (req.method === 'POST' && url === '/stop-all') {
    stopFrontend();
    stopBackend();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Stopping all services' }));
    return;
  }

  // GET /db/status
  if (req.method === 'GET' && url === '/db/status') {
    try {
      const stats = db.getStats();
      const migration = db.getMigrationStatus();
      res.writeHead(200);
      res.end(JSON.stringify({ ...stats, migration }, null, 2));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /db/settings
  if (req.method === 'GET' && url === '/db/settings') {
    res.writeHead(200);
    res.end(JSON.stringify(db.settings.getAll(), null, 2));
    return;
  }

  // --- If not an API route, serve admin UI ---
  res.removeHeader('Content-Type'); // Let serveStatic set it
  serveStatic(req, res);
});

// Graceful shutdown - stop children first, then close everything
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log(`Received ${signal}, shutting down gracefully...`, 'yellow');

  // Track child process exits so we can wait for them
  const exitPromises = [];

  if (frontendProcess) {
    exitPromises.push(new Promise(resolve => {
      frontendProcess.once('close', resolve);
      // If it doesn't exit in 3s, we'll force-kill via the timeout below
    }));
    stopFrontend();
  }

  if (backendProcess) {
    exitPromises.push(new Promise(resolve => {
      backendProcess.once('close', resolve);
    }));
    stopBackend();
  }

  // Wait for children to exit (up to 3s), then clean up
  const childTimeout = setTimeout(() => {
    log('Children did not exit in time, continuing shutdown...', 'yellow');
    finish();
  }, 3000);

  Promise.all(exitPromises).then(() => {
    clearTimeout(childTimeout);
    log('All child processes exited', 'green');
    finish();
  });

  function finish() {
    // Close database
    try {
      db.close();
      log('Database closed', 'green');
    } catch (e) {}

    // Close WebSocket connections
    wsClients.forEach(client => {
      try { client.close(); } catch (e) {}
    });
    wsClients.clear();

    // Close HTTP server
    server.close(() => {
      log('All services stopped. Goodbye!', 'yellow');
      process.exit(0);
    });

    // Force exit after 2 more seconds if server.close hangs
    setTimeout(() => {
      log('Forcing exit...', 'red');
      process.exit(1);
    }, 2000);
  }
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
  // Initialize database
  try {
    db.init();
    db.events.insert('system', 'supervisor', { action: 'startup' });
    log('Database initialized', 'green');
  } catch (err) {
    log(`Database init failed: ${err.message}`, 'red');
  }

  console.log('');
  console.log(`${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}     ${c.green}WORXED SUPERVISOR${c.reset}                                     ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╠════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Admin:       http://localhost:${SUPERVISOR_PORT}                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Backend API: http://localhost:${BACKEND_PORT}                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Frontend:    http://localhost:5173                        ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╠════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Backend:  /start, /stop, /restart                         ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Frontend: /frontend/start, /frontend/stop                 ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  All:      /start-all, /stop-all                           ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  DB:       /db/status, /db/settings                        ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  Proxy:    /api/* -> backend:${BACKEND_PORT}                        ${c.cyan}║${c.reset}`);
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
