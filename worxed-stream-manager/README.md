# Worxed Stream Manager - Lynx Edition

A cross-platform streaming overlay and management system built with **Lynx.js** for "Write Once, Render Anywhere" functionality. Features a terminal/cyberpunk aesthetic matching worxed.com with real-time chat integration, alert system, and overlay management.

## 🚀 Features

- **Cross-Platform**: Web, iOS, Android, and Desktop support via Lynx.js
- **Real-time Communication**: WebSocket integration with Node.js backend
- **Stream Management**: Dashboard, overlay editor, and alert system
- **Terminal Aesthetic**: Cyberpunk design with worxed.com color scheme (#121318, #8cffbe, #b893ff)
- **Twitch Integration**: Real-time chat, follower alerts, and stream data
- **Mobile Responsive**: Native mobile experience with Lynx

## 🛠️ Tech Stack

### Frontend (Lynx.js)
- **Lynx.js**: Cross-platform React alternative
- **TypeScript**: Type-safe development
- **VT323 Font**: Terminal-style typography
- **CSS3**: Custom cyberpunk styling

### Backend (Node.js)
- **Express.js**: Web server framework
- **Socket.IO**: Real-time WebSocket communication
- **Twitch API**: Stream data and chat integration
- **CORS & Security**: Helmet, rate limiting

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- For mobile development: Android SDK / Xcode

### Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd worxed-stream-manager
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp env.example .env
   # Edit .env with your Twitch API credentials
   ```

3. **Development Mode**
   ```bash
   # Run both frontend and backend
   npm run dev:full
   
   # Or run separately:
   npm run server    # Backend only
   npm run dev       # Frontend only
   ```

4. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## 🔧 Configuration

### Twitch API Setup
1. Create a Twitch application at https://dev.twitch.tv/console
2. Add your credentials to `.env`:
   ```
   TWITCH_CLIENT_ID=your_client_id
   TWITCH_ACCESS_TOKEN=your_access_token
   ```

### Environment Variables
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Twitch API
TWITCH_CLIENT_ID=your_client_id
TWITCH_ACCESS_TOKEN=your_access_token

# Security
JWT_SECRET=your_jwt_secret
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## 📱 Cross-Platform Development

### Web Development
```bash
npm run dev
# Access at http://localhost:3000
```

### Mobile Development (Lynx Explorer)
1. **iOS**: Download Lynx Explorer for macOS, drag to iOS Simulator
2. **Android**: Install Lynx Explorer APK, scan QR code from dev server

### Desktop Development
- Lynx supports native desktop rendering
- Use Lynx Explorer or build native desktop app

## 🎨 Design System

### Color Scheme (Worxed Terminal)
- **Background**: `#121318` (Dark terminal)
- **Accent Green**: `#8cffbe` (Matrix green)
- **Accent Purple**: `#b893ff` (Cyberpunk purple)
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#cccccc`

### Typography
- **Font**: VT323 (Terminal monospace)
- **Effects**: Glow, glitch animations
- **Spacing**: Consistent letter-spacing for terminal feel

## 🏗️ Architecture

### Component Structure
```
src/
├── components/
│   ├── DashboardView.tsx    # Main dashboard
│   ├── OverlayView.tsx      # Overlay management
│   └── AlertsView.tsx       # Alert configuration
├── services/
│   ├── WebSocketService.ts  # Real-time communication
│   └── TwitchAPIService.ts  # Twitch integration
└── App.tsx                  # Main application
```

### Backend Structure
```
server.js                    # Express server with Socket.IO
public/                      # Static overlay files
├── overlay-worxed.html      # Main overlay
├── overlay.html             # Basic overlay
└── alerts-manager.html      # Alert system
```

## 🔄 Real-time Features

### WebSocket Events
- `chat_message`: Live chat updates
- `new_alert`: Follow/subscribe/donation alerts
- `viewer_update`: Real-time viewer count
- `overlay_update`: Dynamic overlay changes

### Twitch Integration
- Live stream status
- Viewer and follower counts
- Chat message relay
- Alert triggers

## 📋 Development Roadmap

See `ROADMAP.md` for detailed development phases:
- **Phase 1**: Core functionality ✅
- **Phase 2**: Enhanced UX with Lynx (Current)
- **Phase 3**: Advanced features
- **Phase 4**: Mobile optimization
- **Phase 5**: Enterprise features

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See `CONTRIBUTING.md` and `PROJECT-MANAGEMENT.md` for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## 🔗 Links

- **Worxed.com**: https://worxed.com
- **Lynx.js**: https://lynxjs.org
- **Documentation**: See `DEVELOPMENT-PLAN.md`
- **Issues**: See `ISSUES.md`

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check existing documentation
- Review troubleshooting guides

---

**Worxed Stream Manager - Lynx Edition**  
*Cross-platform streaming tools with terminal aesthetics*
