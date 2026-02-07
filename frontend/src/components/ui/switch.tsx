import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <label
        className={cn(
          'relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full transition-all duration-200',
          checked ? 'bg-primary shadow-sm' : 'bg-input',
          'border border-border',
          className
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <span
          className={cn(
            'absolute h-5 w-5 rounded-full bg-background shadow-sm transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-0.5'
          )}
        />
      </label>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
