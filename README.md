# 🎮 Worxed Stream Manager

A comprehensive, self-hosted streaming overlay and alert system for Twitch streamers. Built with a retro terminal aesthetic and complete independence from third-party services like StreamElements or Streamlabs.

![Terminal Theme](https://img.shields.io/badge/Theme-Terminal-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18+-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Twitch](https://img.shields.io/badge/Platform-Twitch-purple)

## ✨ Features

### 🎨 **Dual Overlay Themes**
- **Standard Theme**: Clean, modern overlay design
- **Worxed Terminal Theme**: Retro terminal aesthetic with VT323 font, scanlines, and glowing effects

### 🚨 **Complete Alert System**
- Real-time follower alerts
- Subscriber notifications (all tiers)
- Donation alerts (any payment processor)
- Cheer/bits alerts
- Raid notifications
- Custom event alerts
- Milestone celebrations

### 📊 **Live Overlays**
- **Chat Overlay**: Real-time chat display with badges
- **Alert Overlay**: Animated notifications
- **Stats Overlay**: Live follower/viewer counts
- **Game Overlay**: Current game and recent followers

### 🛠️ **Management Dashboard**
- Real-time overlay customization
- Alert testing and configuration
- Multi-stream profile management
- Live analytics and statistics
- Event logging and monitoring

### 🔧 **Advanced Features**
- **Production OAuth**: Secure Twitch API integration
- **Multi-Stream Support**: Manage multiple channels
- **Webhook System**: Custom donation integrations
- **Real-time Updates**: WebSocket-powered live data
- **Export/Import**: Backup and restore configurations
- **Comprehensive Testing**: 54 automated tests

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ 
- Twitch Developer Account
- OBS Studio (for overlays)

### 1. Installation
```bash
git clone https://github.com/yourusername/worxed-stream-manager.git
cd worxed-stream-manager
npm install
```

### 2. Configuration
```bash
# Copy environment template
cp env.example .env

# Run OAuth setup (creates production tokens)
npm run setup

# Start the server
npm start
```

### 3. Add to OBS
Add Browser Sources with these URLs:
- **Chat**: `http://localhost:3000/overlay-worxed/chat`
- **Alerts**: `http://localhost:3000/overlay-worxed/alerts`
- **Stats**: `http://localhost:3000/overlay-worxed/stats`

### 4. Access Dashboard
Open `http://localhost:3000` for the management dashboard.

## 📋 Available Endpoints

### Overlays
| URL | Description | Theme |
|-----|-------------|-------|
| `/overlay/chat` | Chat overlay | Standard |
| `/overlay/alerts` | Alert notifications | Standard |
| `/overlay/stats` | Live statistics | Standard |
| `/overlay/game` | Game information | Standard |
| `/overlay-worxed/chat` | Chat overlay | Terminal |
| `/overlay-worxed/alerts` | Alert notifications | Terminal |
| `/overlay-worxed/stats` | Live statistics | Terminal |
| `/overlay-worxed/game` | Game information | Terminal |

### Management
| URL | Description |
|-----|-------------|
| `/` | Main dashboard |
| `/customizer` | Real-time overlay customizer |
| `/alerts` | Alert manager and testing |

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/custom-alert` | POST | Trigger custom alerts |
| `/webhooks/donation` | POST | Donation webhook |
| `/webhooks/twitch` | POST | Twitch EventSub webhook |
| `/api/analytics` | GET | Stream analytics |
| `/api/config` | GET/POST | Configuration management |

## 🔐 OAuth Setup

### Option 1: Device Code Flow (Recommended)
```bash
npm run setup
```
- No HTTPS required
- Perfect for local development
- Secure production tokens

### Option 2: Manual Setup
1. Create app at [Twitch Developer Console](https://dev.twitch.tv/console)
2. Set redirect URI: `http://localhost:3000/auth/callback`
3. Generate Client ID and Secret
4. Update `.env` file

## 🎯 Testing

### Run All Tests
```bash
npm test
```

### Specific Test Suites
```bash
npm run test:health      # Server health
npm run test:oauth       # OAuth validation
npm run test:api         # Twitch API
npm run test:overlays    # Overlay pages
npm run test:alerts      # Alert system
```

### Pre-Test Check
```bash
npm run pretest
```

## 🎨 Customization

### Terminal Theme Colors
- **Background**: `#121318` (Dark terminal)
- **Primary**: `#8cffbe` (Pastel green)
- **Secondary**: `#b893ff` (Pastel purple)
- **Font**: VT323 (Monospace terminal font)

### Custom Alerts
```javascript
// Send custom alert via API
fetch('/api/custom-alert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'milestone',
    data: {
      title: '1000 Followers!',
      message: 'Thank you everyone!',
      timestamp: new Date().toISOString()
    }
  })
});
```

### Donation Integration
```javascript
// Webhook for payment processors
fetch('/webhooks/donation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'DonorName',
    amount: '5.00',
    message: 'Great stream!',
    currency: 'USD',
    processor: 'paypal'
  })
});
```

## 🔧 Configuration Management

### Multi-Stream Profiles
- Save unlimited stream configurations
- Quick switching between channels
- Export/import profile backups
- Real-time configuration updates

### Environment Variables
```bash
# Required
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_OAUTH_TOKEN=your_oauth_token
TWITCH_REFRESH_TOKEN=your_refresh_token
TWITCH_CHANNEL=your_username
TWITCH_BOT_USERNAME=your_username

# Optional
PORT=3000
WEBHOOK_URL=https://your-domain.com/webhooks/twitch
TWITCH_WEBHOOK_SECRET=your_webhook_secret
```

## 📊 Analytics & Monitoring

### Live Statistics
- Current viewer count
- Total followers
- Chat message count
- Stream uptime
- Recent events

### Event Logging
- All alerts and notifications
- Configuration changes
- API requests
- Error tracking
- Performance metrics

## 🌐 Production Deployment

### Local Development
```bash
npm start
# Server runs on http://localhost:3000
```

### Production (VPS/Cloud)
1. Set up domain with SSL
2. Configure reverse proxy (nginx/Apache)
3. Update `WEBHOOK_URL` in `.env`
4. Use PM2 for process management
5. Set up Twitch EventSub webhooks

### Docker (Optional)
```bash
docker build -t worxed-stream-manager .
docker run -p 3000:3000 --env-file .env worxed-stream-manager
```

## 🛠️ Development

### Project Structure
```
├── server.js                 # Main server
├── public/                   # Frontend files
│   ├── index.html           # Dashboard
│   ├── overlay.html         # Standard overlays
│   ├── overlay-worxed.html  # Terminal overlays
│   ├── customizer.html      # Overlay customizer
│   └── alerts-manager.html  # Alert management
├── test-suite.js            # Comprehensive tests
├── setup-production-auth-device.js # OAuth setup
└── env.example              # Environment template
```

### Adding New Features
1. Update server endpoints in `server.js`
2. Add frontend components to `public/`
3. Create tests in `test-suite.js`
4. Update documentation

### Contributing
1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit pull request

## 📝 API Documentation

### Custom Alert API
```http
POST /api/custom-alert
Content-Type: application/json

{
  "type": "custom-follow",
  "data": {
    "username": "NewFollower",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Donation Webhook
```http
POST /webhooks/donation
Content-Type: application/json

{
  "username": "DonorName",
  "amount": "5.00",
  "message": "Great stream!",
  "currency": "USD",
  "processor": "paypal"
}
```

## 🔍 Troubleshooting

### Common Issues

**Server won't start**
- Check if port 3000 is available
- Verify Node.js version (14+)
- Run `npm install` to install dependencies

**OAuth errors**
- Regenerate tokens with `npm run setup`
- Check Client ID and Secret in `.env`
- Verify scopes in Twitch Developer Console

**Overlays not loading**
- Ensure server is running
- Check browser console for errors
- Verify URLs in OBS Browser Source

**Alerts not working**
- Test alerts in Alert Manager (`/alerts`)
- Check WebSocket connection
- Verify webhook configurations

### Getting Help
1. Check the [Issues](https://github.com/yourusername/worxed-stream-manager/issues) page
2. Run the test suite: `npm test`
3. Check server logs for errors
4. Review the troubleshooting guide in `TESTING.md`

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Twitch API** for real-time streaming data
- **Socket.IO** for WebSocket communication
- **VT323 Font** for the authentic terminal aesthetic
- **TMI.js** for Twitch chat integration

## 🚀 Roadmap

- [ ] Stream Deck integration
- [ ] Mobile dashboard app
- [ ] Advanced analytics dashboard
- [ ] Multi-platform support (YouTube, etc.)
- [ ] Plugin system for custom extensions
- [ ] Cloud deployment templates

---

**Built with ❤️ for the streaming community**

*Transform your stream with professional overlays and complete control over your alerts - no third-party dependencies required!* 