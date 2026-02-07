import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground',
        outline:
          'border-border text-foreground',
        follow:
          'border-transparent bg-chart-1 text-white',
        subscribe:
          'border-transparent bg-chart-2 text-white',
        donation:
          'border-transparent bg-chart-3 text-black',
        raid:
          'border-transparent bg-chart-4 text-white',
        live:
          'border-transparent bg-chart-5 text-white animate-live',
        offline:
          'border-transparent bg-muted-foreground text-white',
        online:
          'border-transparent bg-success text-success-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
