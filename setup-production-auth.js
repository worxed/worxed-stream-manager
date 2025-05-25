const readline = require('readline');
const fs = require('fs');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 WORXED STREAM MANAGER - Production OAuth Setup');
console.log('================================================\n');

console.log('📋 Before starting, make sure you have:');
console.log('1. Created a Twitch Developer Application at https://dev.twitch.tv/console');
console.log('2. Set OAuth Redirect URL to: http://localhost:3000/auth/callback');
console.log('   (Note: Use exactly "http://localhost:3000/auth/callback" - Twitch allows this for development)');
console.log('3. Generated a Client Secret for your application\n');

const config = {};

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setupProduction() {
  try {
    // Basic Application Info
    console.log('🔧 APPLICATION CONFIGURATION');
    console.log('============================');
    
    config.TWITCH_CLIENT_ID = await askQuestion('Enter your Twitch Client ID: ');
    config.TWITCH_CLIENT_SECRET = await askQuestion('Enter your Twitch Client Secret: ');
    config.TWITCH_CHANNEL = await askQuestion('Enter your Twitch channel name (e.g., your_username): ');
    config.TWITCH_BOT_USERNAME = await askQuestion('Enter bot username (usually same as channel): ');
    
    console.log('\n🔐 OAUTH TOKEN GENERATION');
    console.log('=========================');
    console.log('We need to generate an OAuth token with the proper scopes...\n');
    
    // Generate OAuth URL
    const scopes = [
      'chat:read',
      'chat:edit', 
      'channel:moderate',
      'channel:read:subscriptions',
      'channel:read:redemptions',
      'channel:manage:redemptions',
      'channel:read:hype_train',
      'channel:read:polls',
      'channel:manage:polls',
      'channel:read:predictions',
      'channel:manage:predictions',
      'moderator:read:followers',
      'moderator:read:chatters',
      'user:read:email',
      'user:read:follows',
      'bits:read'
    ].join(' ');
    
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${config.TWITCH_CLIENT_ID}&redirect_uri=http://localhost:3000/auth/callback&scope=${encodeURIComponent(scopes)}&state=${state}`;
    
    console.log('🌐 AUTHORIZATION REQUIRED');
    console.log('========================');
    console.log('1. Open this URL in your browser:');
    console.log(`\n${authUrl}\n`);
    console.log('2. Authorize the application');
    console.log('3. Copy the "code" parameter from the redirect URL');
    console.log('   (It will look like: http://localhost:3000/auth/callback?code=XXXXXX&scope=...)');
    
    const authCode = await askQuestion('\nEnter the authorization code: ');
    
    // Exchange code for token
    console.log('\n🔄 Exchanging authorization code for access token...');
    
    const fetch = require('node-fetch');
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.TWITCH_CLIENT_ID,
        client_secret: config.TWITCH_CLIENT_SECRET,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.access_token) {
      config.TWITCH_OAUTH_TOKEN = tokenData.access_token;
      config.TWITCH_REFRESH_TOKEN = tokenData.refresh_token;
      
      console.log('✅ OAuth token obtained successfully!');
      console.log(`🔑 Access Token: ${tokenData.access_token.substring(0, 10)}...`);
      console.log(`🔄 Refresh Token: ${tokenData.refresh_token.substring(0, 10)}...`);
      console.log(`⏰ Expires in: ${tokenData.expires_in} seconds`);
    } else {
      console.error('❌ Failed to get OAuth token:', tokenData);
      process.exit(1);
    }
    
    // Additional Configuration
    console.log('\n⚙️  ADDITIONAL CONFIGURATION');
    console.log('============================');
    
    config.PORT = await askQuestion('Server port (default: 3000): ') || '3000';
    config.WEBHOOK_URL = await askQuestion('Webhook URL (for production, e.g., https://yourdomain.com/webhooks/twitch): ') || '';
    config.TWITCH_WEBHOOK_SECRET = crypto.randomBytes(32).toString('hex');
    
    // Generate .env file
    console.log('\n📝 GENERATING CONFIGURATION FILES');
    console.log('=================================');
    
    const envContent = Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Backup existing .env
    if (fs.existsSync('.env')) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync('.env', `.env.backup.${timestamp}`);
      console.log(`📋 Backed up existing .env to .env.backup.${timestamp}`);
    }
    
    // Write new .env
    fs.writeFileSync('.env', envContent);
    console.log('✅ Created new .env file with production configuration');
    
    // Generate production deployment guide
    const deploymentGuide = `# WORXED STREAM MANAGER - Production Deployment Guide

## 🚀 Your Production Configuration

**Application Details:**
- Client ID: ${config.TWITCH_CLIENT_ID}
- Channel: ${config.TWITCH_CHANNEL}
- Bot Username: ${config.TWITCH_BOT_USERNAME}
- Server Port: ${config.PORT}

## 🔐 Security Notes

1. **Keep your Client Secret secure** - Never commit it to version control
2. **Webhook Secret**: ${config.TWITCH_WEBHOOK_SECRET}
3. **Access tokens expire** - Use the refresh token to get new ones
4. **Refresh Token**: Store securely, it's used to get new access tokens

## 🌐 Production Deployment

### For VPS/Cloud Deployment:
1. Set up your domain and SSL certificate
2. Update WEBHOOK_URL in .env to your production domain
3. Configure reverse proxy (nginx/Apache) to forward to port ${config.PORT}
4. Set up process manager (PM2) to keep the server running

### For Local Development:
1. Your server will run on http://localhost:${config.PORT}
2. Use ngrok for webhook testing: \`ngrok http ${config.PORT}\`

## 🔄 Token Refresh

Your access token expires in ~4 hours. The server automatically handles refresh using the refresh token.

## 📊 Available Endpoints

- Dashboard: http://localhost:${config.PORT}/
- Chat Overlay: http://localhost:${config.PORT}/overlay/chat
- Alerts Overlay: http://localhost:${config.PORT}/overlay/alerts
- Worxed Theme: http://localhost:${config.PORT}/overlay-worxed/chat
- Alert Manager: http://localhost:${config.PORT}/alerts

## 🎯 EventSub Webhooks

For production alerts, configure these webhooks in Twitch Developer Console:
- Webhook URL: ${config.WEBHOOK_URL || 'https://yourdomain.com'}/webhooks/twitch
- Secret: ${config.TWITCH_WEBHOOK_SECRET}

## 🛠️ Troubleshooting

1. **Token Issues**: Check token validity at https://id.twitch.tv/oauth2/validate
2. **Webhook Issues**: Verify webhook secret and URL in Twitch Developer Console
3. **Chat Connection**: Ensure bot username and OAuth token are correct

Generated on: ${new Date().toISOString()}
`;
    
    fs.writeFileSync('PRODUCTION-SETUP.md', deploymentGuide);
    console.log('📖 Created PRODUCTION-SETUP.md with deployment guide');
    
    console.log('\n🎉 SETUP COMPLETE!');
    console.log('==================');
    console.log('✅ Production OAuth tokens configured');
    console.log('✅ Environment variables updated');
    console.log('✅ Deployment guide created');
    console.log('\n🚀 Start your server with: npm start');
    console.log('📖 Read PRODUCTION-SETUP.md for deployment instructions');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setupProduction(); 