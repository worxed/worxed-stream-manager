import { forwardRef } from 'react';
import { Toast, type ToastProps } from 'primereact/toast';

export const WToast = forwardRef<Toast, ToastProps>((props, ref) => {
  return <Toast ref={ref} position="top-right" {...props} />;
});

WToast.displayName = 'WToast';
