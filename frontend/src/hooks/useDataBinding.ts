import { useState, useEffect, useRef } from 'react';
import { socketService } from '../services/socket';
import { resolveTemplate, getNestedValue } from '../utils/templateResolver';
import type { DataBindingConfig } from '../types';

interface UseDataBindingResult {
  boundValue: string | null;
}

export function useDataBinding(
  config: DataBindingConfig | undefined,
  mode: 'text' | 'image'
): UseDataBindingResult {
  const [boundValue, setBoundValue] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabled = config?.enabled && config?.eventName;

  useEffect(() => {
    if (!enabled || !config) {
      setBoundValue(null);
      return;
    }

    // Set default value initially
    if (config.defaultValue) {
      setBoundValue(config.defaultValue);
    }

    const unsub = socketService.on(config.eventName, (raw) => {
      const data = (raw != null && typeof raw === 'object') ? raw as Record<string, unknown> : {};

      let value: string;
      if (mode === 'image') {
        const field = config.fieldForSrc || config.fieldPath;
        const extracted = field ? getNestedValue(data, field) : undefined;
        value = extracted != null ? String(extracted) : '';
      } else {
        if (config.template) {
          value = resolveTemplate(config.template, data);
        } else if (config.fieldPath) {
          const extracted = getNestedValue(data, config.fieldPath);
          value = extracted != null ? String(extracted) : '';
        } else {
          value = '';
        }
      }

      setBoundValue(value);

      // Handle timeout revert
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (config.timeout && config.timeout > 0) {
        timeoutRef.current = setTimeout(() => {
          setBoundValue(config.defaultValue ?? null);
        }, config.timeout * 1000);
      }
    });

    return () => {
      unsub();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, config?.eventName, config?.fieldPath, config?.template, config?.fieldForSrc, config?.defaultValue, config?.timeout, mode]);

  return { boundValue: enabled ? boundValue : null };
}
