import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Bell,
  Palette,
  Terminal,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { socketService } from './services/socket';
import { getSettings } from './services/api';
import { Badge } from '@/components/ui';
import { ToastProvider, useToast, setToastFunction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import Dashboard from './components/Dashboard';
import Alerts from './components/Alerts';
import Customizer from './components/Customizer';
import BackendDashboard from './components/BackendDashboard';
import ModeToggle, { initDarkMode } from './components/ThemeSwitcher';
import Overlay from './components/Overlay';

// Initialize dark mode immediately (before React renders)
initDarkMode();

// Route check before hooks — overlay gets its own render tree
const isOverlay = window.location.pathname === '/overlay';

type View = 'dashboard' | 'alerts' | 'customizer' | 'backend';

export default function App() {
  if (isOverlay) {
    return <Overlay />;
  }

  return (
    <ToastProvider>
      <AppMain />
    </ToastProvider>
  );
}

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ active, onClick, icon, label }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-6 py-3 rounded-b-2xl transition-all duration-200 ease-out',
        'text-[15px] font-medium h-6 w-32 items-center justify-center',
        active
          ? 'bg-foreground text-background shadow-md'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function AppMain() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();

  // Register toast function for external use
  useEffect(() => {
    setToastFunction(toast);
  }, [toast]);

  useEffect(() => {
    // Connect to socket
    socketService.connect();

    // Fetch overlay settings from DB
    getSettings('overlay').then(result => {
      if (!result.data) return;
      for (const setting of result.data) {
        if (setting.key === 'overlay.mode') {
          const mode = setting.value as 'dark' | 'light';
          document.documentElement.classList.toggle('dark', mode === 'dark');
          localStorage.setItem('worxed-mode', mode);
        } else if (setting.key === 'overlay.fontSize' && typeof setting.value === 'number') {
          document.documentElement.style.fontSize = `${setting.value}px`;
        }
      }
    });

    // Listen for live settings changes from admin
    const unsubSettings = socketService.onSettingsChanged((event) => {
      if (event.deleted) return;
      if (event.key === 'overlay.mode') {
        const mode = event.value as 'dark' | 'light';
        document.documentElement.classList.toggle('dark', mode === 'dark');
        localStorage.setItem('worxed-mode', mode);
      } else if (event.key === 'overlay.fontSize' && typeof event.value === 'number') {
        document.documentElement.style.fontSize = `${event.value}px`;
      }
    });

    const unsubConnect = socketService.onConnect(() => {
      setConnected(true);
      toast({
        title: 'Connected',
        message: 'Connected to stream manager backend',
        type: 'success',
      });
    });

    const unsubDisconnect = socketService.onDisconnect((reason) => {
      setConnected(false);
      toast({
        title: 'Disconnected',
        message: `Lost connection: ${reason}`,
        type: 'error',
      });
    });

    return () => {
      unsubSettings();
      unsubConnect();
      unsubDisconnect();
      socketService.disconnect();
    };
  }, [toast]);

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
    <div className="min-h-screen bg-background flex flex-col relative content-center">
      {/* Ambient background orbs */}
      <div className="ambient-bg" />

      {/* Header + Navigation */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border shrink-0 relative z-10 self-center">
        <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between px-8 h-[72px]">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              WORXED
            </h1>
            <Badge variant="secondary" className="text-[10px] px-2.5 py-0.5">v2.0</Badge>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:4000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
            >
              <ExternalLink size={14} />
              <span>Admin</span>
            </a>
            <ModeToggle />
            <Badge variant={connected ? 'online' : 'destructive'} className="gap-1.5">
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="text-xs">
                {connected ? 'Online' : 'Offline'}
              </span>
            </Badge>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="max-w-[1200px] mx-auto w-full flex items-center justify-center gap-2 px-8 pb-4 overflow-x-auto" >
          <NavItem
            active={activeView === 'dashboard'}
            onClick={() => setActiveView('dashboard')}
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
          />
          <NavItem
            active={activeView === 'alerts'}
            onClick={() => setActiveView('alerts')}
            icon={<Bell size={18} />}
            label="Alerts"
          />
          <NavItem
            active={activeView === 'customizer'}
            onClick={() => setActiveView('customizer')}
            icon={<Palette size={18} />}
            label="Customizer"
          />
          <NavItem
            active={activeView === 'backend'}
            onClick={() => setActiveView('backend')}
            icon={<Terminal size={18} />}
            label="Backend"
          />
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto px-8 py-10 relative z-[1] self-center w-auto">
        <div className="max-w-[1200px] mx-aut ">
          <div key={activeView} className="animate-view-enter">
            {renderView()}
          </div>
        </div>
      </main>
    </div>
  );
}
