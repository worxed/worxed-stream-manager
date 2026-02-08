import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Bell,
  Palette,
  Terminal,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { socketService } from './services/socket';
import { getSettings } from './services/api';
import { toastRef, showToast } from './services/toast';
import Dashboard from './components/Dashboard';
import Alerts from './components/Alerts';
import Customizer from './components/Customizer';
import BackendDashboard from './components/BackendDashboard';
import ThemePicker, { initTheme, applyTheme } from './components/ThemeSwitcher';
import { THEME_STORAGE_KEY, MODE_STORAGE_KEY, type ThemeName, type ThemeMode } from './themes/themes';
import Overlay from './components/Overlay';
import { Button } from 'primereact/button';

// Initialize theme + mode immediately (before React renders)
initTheme();

// Route check before hooks — overlay gets its own render tree
const isOverlay = window.location.pathname === '/overlay';

type View = 'dashboard' | 'alerts' | 'customizer' | 'backend';

export default function App() {
  if (isOverlay) {
    return <Overlay />;
  }

  return <AppMain />;
}

interface CursorPosition {
  left: number;
  width: number;
  opacity: number;
}

const tabs: Array<{ view: View; icon: React.ReactNode; label: string }> = [
  { view: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { view: 'alerts', icon: <Bell size={18} />, label: 'Alerts' },
  { view: 'customizer', icon: <Palette size={18} />, label: 'Customizer' },
  { view: 'backend', icon: <Terminal size={18} />, label: 'Backend' },
];

function SlideNav({ activeView, setActiveView }: { activeView: View; setActiveView: (v: View) => void }) {
  const [cursor, setCursor] = useState<CursorPosition>({ left: 0, width: 0, opacity: 0 });
  const tabRefs = useRef<Map<View, HTMLButtonElement>>(new Map());

  // Snap cursor to the active tab on mount + when activeView changes
  useEffect(() => {
    const el = tabRefs.current.get(activeView);
    if (el) {
      setCursor({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1 });
    }
  }, [activeView]);

  return (
    <div className="relative flex " style={{ padding: 15 }}>
      {/* Background shape — sits behind everything, doesn't clip */}

      {tabs.map((tab) => {
        const isActive = activeView === tab.view;
        return (
          <motion.button
            key={tab.view}
            ref={(el) => { if (el) tabRefs.current.set(tab.view, el); }}
            onClick={() => setActiveView(tab.view)}
            whileHover={isActive ? {} : { y: -2, rotate: -1.5 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`relative z-10 flex items-center gap-2.5 font-medium rounded-full whitespace-nowrap${isActive ? ' text-primary-foreground' : ' text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            style={{ padding: '0.625rem 1.5rem' }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </motion.button>
        );
      })}
      {/* Sliding pill cursor */}
      <motion.div
        className="absolute z-5 rounded-full bg-foreground"
        style={{ top: 15, bottom: 15 }}
        animate={{
          left: cursor.left,
          width: cursor.width,
          opacity: cursor.opacity,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </div>
  );
}

function AppMain() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to socket
    socketService.connect();

    // Fetch overlay settings from DB
    getSettings('overlay').then(result => {
      if (!result.data) return;
      for (const setting of result.data) {
        if (setting.key === 'overlay.theme') {
          const theme = setting.value as ThemeName;
          const mode = (localStorage.getItem(MODE_STORAGE_KEY) || 'dark') as ThemeMode;
          applyTheme(theme, mode);
        } else if (setting.key === 'overlay.mode') {
          const mode = setting.value as ThemeMode;
          const theme = (localStorage.getItem(THEME_STORAGE_KEY) || 'zinc') as ThemeName;
          applyTheme(theme, mode);
        } else if (setting.key === 'overlay.fontSize' && typeof setting.value === 'number') {
          document.documentElement.style.fontSize = `${setting.value}px`;
        }
      }
    });

    // Listen for live settings changes from admin
    const unsubSettings = socketService.onSettingsChanged((event) => {
      if (event.deleted) return;
      if (event.key === 'overlay.theme') {
        const theme = event.value as ThemeName;
        const mode = (localStorage.getItem(MODE_STORAGE_KEY) || 'dark') as ThemeMode;
        applyTheme(theme, mode);
      } else if (event.key === 'overlay.mode') {
        const mode = event.value as ThemeMode;
        const theme = (localStorage.getItem(THEME_STORAGE_KEY) || 'zinc') as ThemeName;
        applyTheme(theme, mode);
      } else if (event.key === 'overlay.fontSize' && typeof event.value === 'number') {
        document.documentElement.style.fontSize = `${event.value}px`;
      }
    });

    const unsubConnect = socketService.onConnect(() => {
      setConnected(true);
      showToast('success', 'Connected', 'Connected to stream manager backend');
    });

    const unsubDisconnect = socketService.onDisconnect((reason) => {
      setConnected(false);
      showToast('error', 'Disconnected', `Lost connection: ${reason}`);
    });

    return () => {
      unsubSettings();
      unsubConnect();
      unsubDisconnect();
      socketService.disconnect();
    };
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'alerts':
        return <Alerts />;
      case 'customizer':
        return <Customizer />;
      case 'backend':
        return <BackendDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <Toast ref={toastRef} position="top-right" />

      {/* Ambient background orbs */}
      <div className="ambient-bg" />

      {/* Header + Navigation */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border shrink-0 relative z-10 w-full">
        <div className="content-container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              worxed-stream-manager
            </h1>
            <Tag value="v1.0" severity="secondary" rounded style={{ padding: 5, fontSize: '10px' }} />
          </div>

          <div className="flex items-center gap-3">
            <Button
              label="Admin Panel"
              icon={<ExternalLink size={14} />}
              onClick={()=>window.open('http://localhost:4000', '_blank')}
              className = "gap-1.5"
            />
            <ThemePicker />
            <Tag
              value={connected ? 'Online' : 'Offline'}
              severity={connected ? 'success' : 'danger'}
              icon={connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              className="gap-1.5"
              rounded
              style={{ padding: 5 }}
            />
          </div>
        </div>

        {/* Navigation tabs — sliding pill */}
        <nav className="content-container flex items-center justify-center pb-3 overflow-x-auto " >
          <SlideNav activeView={activeView} setActiveView={setActiveView} />
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto py-8 relative z-1">
        <div className="content-container">
          <div key={activeView} className="animate-view-enter">
            {renderView()}
          </div>
        </div>
      </main>
    </div>
  );
}
