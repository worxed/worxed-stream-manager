const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🔒 Creating Local HTTPS Setup for Twitch OAuth');
console.log('===============================================\n');

// Check if OpenSSL is available
try {
  execSync('openssl version', { stdio: 'ignore' });
  console.log('✅ OpenSSL found');
} catch (error) {
  console.log('❌ OpenSSL not found. Installing via chocolatey...');
  try {
    execSync('choco install openssl', { stdio: 'inherit' });
    console.log('✅ OpenSSL installed');
  } catch (chocoError) {
    console.log('❌ Could not install OpenSSL automatically.');
    console.log('Please install OpenSSL manually or use Option 3 below.');
    process.exit(1);
  }
}

// Create certificates directory
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

console.log('🔑 Generating self-signed certificate...');

// Generate private key
execSync(`openssl genrsa -out ${path.join(certDir, 'key.pem')} 2048`, { stdio: 'inherit' });

// Generate certificate
const certConfig = `
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = Local
L = Local
O = Worxed Stream Manager
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
`;

fs.writeFileSync(path.join(certDir, 'cert.conf'), certConfig);

execSync(`openssl req -new -x509 -key ${path.join(certDir, 'key.pem')} -out ${path.join(certDir, 'cert.pem')} -days 365 -config ${path.join(certDir, 'cert.conf')}`, { stdio: 'inherit' });

console.log('✅ Certificate generated successfully!');
console.log('\n📋 Next steps:');
console.log('1. In Twitch Developer Console, set redirect URI to: https://localhost:3000/auth/callback');
console.log('2. Run the server with HTTPS enabled');
console.log('3. Accept the browser security warning (self-signed certificate)');

// Create HTTPS server configuration
const httpsServerCode = `
// Add this to your server.js for HTTPS support
const https = require('https');
const fs = require('fs');
const path = require('path');

// HTTPS configuration for local development
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

// Create HTTPS server instead of HTTP
const httpsServer = https.createServer(httpsOptions, app);
const io = socketIo(httpsServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Start HTTPS server
const PORT = process.env.PORT || 3000;
httpsServer.listen(PORT, () => {
  console.log(\`🚀 Twitch Overlay Server running on https://localhost:\${PORT}\`);
  // ... rest of your console.log statements
});
`;

fs.writeFileSync('https-server-config.txt', httpsServerCode);
console.log('\n📄 Created https-server-config.txt with HTTPS setup code'); 