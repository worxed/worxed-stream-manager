import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui';

function getStoredMode(): 'dark' | 'light' {
  const stored = localStorage.getItem('worxed-mode');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyMode(mode: 'dark' | 'light') {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  localStorage.setItem('worxed-mode', mode);
}

export function initDarkMode() {
  applyMode(getStoredMode());
}

export default function ModeToggle() {
  const [mode, setMode] = useState<'dark' | 'light'>(getStoredMode);

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  const toggle = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-2 rounded-xl">
      {mode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      <span className="text-sm">{mode === 'dark' ? 'Dark' : 'Light'}</span>
    </Button>
  );
}
