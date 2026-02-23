import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <div className="mb-4 p-4 rounded-2xl bg-muted/50 opacity-60">
        {icon}
      </div>
      <p className="text-sm font-semibold text-muted-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground/60">{description}</p>
    </div>
  );
}
