import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, children, side = 'top', className }, ref) => {
    return (
      <div ref={ref} className="relative inline-flex group">
        {children}
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap',
            'bg-popover border border-border text-popover-foreground shadow-lg',
            'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
            'transition-all duration-150 ease-out',
            'pointer-events-none',
            // Position based on side
            side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
            side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
            side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
            side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
            className
          )}
        >
          {content}
          {/* Arrow */}
          <span
            className={cn(
              'absolute w-2 h-2 bg-popover border-border rotate-45',
              side === 'top' && 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-b border-r',
              side === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-t border-l',
              side === 'left' && 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-t border-r',
              side === 'right' && 'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-b border-l'
            )}
          />
        </div>
      </div>
    );
  }
);
Tooltip.displayName = 'Tooltip';

export { Tooltip };
