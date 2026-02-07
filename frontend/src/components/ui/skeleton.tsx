import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text';
}

function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-border/50 via-border to-border/50 bg-[length:200%_100%]',
        variant === 'default' && 'rounded-xl',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded h-4',
        className
      )}
      style={{
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
      {...props}
    />
  );
}

// Preset skeleton layouts
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-5 rounded-2xl border border-border bg-card', className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-background/50">
          <Skeleton variant="circular" className="w-8 h-8" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/3 mb-1" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function SkeletonStats({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl border border-border bg-card text-center">
          <Skeleton className="h-3 w-16 mx-auto mb-2" />
          <Skeleton className="h-8 w-20 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonList, SkeletonStats };
