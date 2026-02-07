import * as React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: 'default' | 'success' | 'error' | 'warning';
}

interface ToastContextType {
  toasts: Toast[];
  toast: (options: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...options, id }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-2xl border shadow-xl animate-in slide-in-from-right',
            'bg-card border-border backdrop-blur-sm',
            toast.type === 'success' && 'border-success',
            toast.type === 'error' && 'border-destructive',
            toast.type === 'warning' && 'border-warning'
          )}
        >
          <div className="flex-1">
            <p
              className={cn(
                'text-sm font-medium',
                toast.type === 'success' && 'text-success',
                toast.type === 'error' && 'text-destructive',
                toast.type === 'warning' && 'text-warning',
                toast.type === 'default' && 'text-foreground'
              )}
            >
              {toast.title}
            </p>
            {toast.message && (
              <p className="text-muted-foreground text-sm mt-1">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// Standalone toast function for use outside React context
let toastFn: ToastContextType['toast'] | null = null;

export function setToastFunction(fn: ToastContextType['toast']) {
  toastFn = fn;
}

export function toast(options: Omit<Toast, 'id'>) {
  if (toastFn) {
    toastFn(options);
  } else {
    console.warn('Toast called before ToastProvider mounted');
  }
}
