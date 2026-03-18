import { forwardRef } from 'react';
import { OverlayPanel, type OverlayPanelProps } from 'primereact/overlaypanel';

export const WOverlayPanel = forwardRef<OverlayPanel, OverlayPanelProps>(
  (props, ref) => {
    return <OverlayPanel ref={ref} {...props} />;
  }
);

WOverlayPanel.displayName = 'WOverlayPanel';
