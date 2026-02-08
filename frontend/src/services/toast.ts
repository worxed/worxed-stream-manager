import { createRef } from 'react';
import type { Toast } from 'primereact/toast';

export const toastRef = createRef<Toast>();

export function showToast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail?: string) {
  toastRef.current?.show({ severity, summary, detail, life: 5000 });
}
