import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-charcoal-200 bg-charcoal-50/50 px-6 py-10 text-center',
        className
      )}
    >
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-500">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-charcoal-800">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-500">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}