import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'unstyled';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex w-full rounded-xl text-sm transition-colors',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'default' && [
            'h-11 px-4 py-2.5',
            'bg-background border border-input',
            'text-foreground',
          ],
          variant === 'unstyled' && [
            'bg-transparent border-0',
            'text-foreground',
          ],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
