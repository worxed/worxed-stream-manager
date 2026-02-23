import { useState, useRef } from 'react';
import { Palette, Sun, Moon, Check } from 'lucide-react';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import {
  themes,
  THEME_STORAGE_KEY,
  MODE_STORAGE_KEY,
  type ThemeName,
  type ThemeMode,
} from '../themes/themes';

function getStoredTheme(): ThemeName {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored && themes.some((t) => t.name === stored)) return stored as ThemeName;
  return 'zinc';
}

function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeName, mode: ThemeMode) {
  const html = document.documentElement;

  // Set data-theme attribute (remove for zinc — uses :root defaults)
  if (theme === 'zinc') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', theme);
  }

  // Toggle dark class
  html.classList.toggle('dark', mode === 'dark');

  // Persist
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  localStorage.setItem(MODE_STORAGE_KEY, mode);
}

export function initTheme() {
  applyTheme(getStoredTheme(), getStoredMode());
}

export default function ThemePicker() {
  const [theme, setTheme] = useState<ThemeName>(getStoredTheme);
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);
  const op = useRef<OverlayPanel>(null);

  const currentDef = themes.find((t) => t.name === theme)!;

  const selectTheme = (name: ThemeName) => {
    setTheme(name);
    applyTheme(name, mode);
  };

  const selectMode = (m: ThemeMode) => {
    setMode(m);
    applyTheme(theme, m);
  };

  return (
    <>
      <Button
        text
        size="small"
        onClick={(e) => op.current?.toggle(e)}
        className="gap-2 rounded-xl"
      >
        <Palette size={16} />
        <span className="text-sm">{currentDef.label}</span>
        {mode === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
      </Button>

      <OverlayPanel ref={op} className="w-72">
        <div className="flex flex-col gap-3">
          {/* Theme list */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground px-2 pb-1">Theme</span>
            {themes.map((t) => {
              const isActive = theme === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => selectTheme(t.name)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors w-full ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50 text-foreground'
                  }`}
                >
                  {/* Color swatches */}
                  <div className="flex gap-1 shrink-0">
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ background: t.swatches[0] }}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ background: t.swatches[1] }}
                    />
                  </div>

                  {/* Label + description */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  </div>

                  {/* Check icon */}
                  {isActive && <Check size={16} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Mode toggle */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground px-2 pb-1">Mode</span>
            <div className="flex gap-1 p-1 bg-muted rounded-xl">
              <button
                onClick={() => selectMode('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'light'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sun size={14} />
                Light
              </button>
              <button
                onClick={() => selectMode('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'dark'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Moon size={14} />
                Dark
              </button>
            </div>
          </div>
        </div>
      </OverlayPanel>
    </>
  );
}
