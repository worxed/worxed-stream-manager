import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-2xl border transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-border bg-card hover:border-input',
        elevated: 'border-border bg-card shadow-lg shadow-black/5 dark:shadow-black/30 hover:shadow-xl hover:border-input',
        inset: 'border-border/50 bg-background/50 shadow-inner',
        accent: 'border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50',
        ghost: 'border-transparent bg-transparent hover:bg-accent hover:border-border',
        stat: 'border-border bg-gradient-to-br from-card to-background shadow-sm hover:border-input hover:shadow-md',
      },
      padding: {
        none: 'p-0',
        sm: 'p-5',
        default: 'p-7',
        lg: 'p-9',
      },
      interactive: {
        true: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, interactive }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { border?: boolean }
>(({ className, border, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col space-y-1.5 pb-5',
      border && 'border-b border-border mb-5',
      className
    )}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' | 'div' }
>(({ className, as: Component = 'div', ...props }, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-lg font-semibold text-foreground',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { border?: boolean }
>(({ className, border, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center pt-4',
      border && 'border-t border-border mt-4',
      className
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
