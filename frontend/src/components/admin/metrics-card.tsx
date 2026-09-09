'use client';

import { ArrowDown, ArrowUp, Minus, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MetricsCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  accent?: string;
  footer?: React.ReactNode;
  className?: string;
}

export function MetricsCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  accent = 'from-primary-500 to-primary-700',
  footer,
  className,
}: MetricsCardProps) {
  const trendDirection = trend && trend > 0 ? 'up' : trend && trend < 0 ? 'down' : 'flat';

  return (
    <div className={cn('rounded-xl border border-charcoal-200/70 bg-white p-5 shadow-sm transition-all hover:shadow-md', className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-charcoal-800">{value}</p>
        </div>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm', accent)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>

      {(trend !== undefined || footer) && (
        <div className="mt-3 flex items-center justify-between border-t border-charcoal-100 pt-3">
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              {trendDirection === 'up' && <ArrowUp className="h-3.5 w-3.5 text-green-600" />}
              {trendDirection === 'down' && <ArrowDown className="h-3.5 w-3.5 text-red-500" />}
              {trendDirection === 'flat' && <Minus className="h-3.5 w-3.5 text-charcoal-400" />}
              <span
                className={cn(
                  'text-xs font-semibold',
                  trendDirection === 'up' && 'text-green-600',
                  trendDirection === 'down' && 'text-red-500',
                  trendDirection === 'flat' && 'text-charcoal-500'
                )}
              >
                {trend > 0 ? `+${trend}%` : `${trend}%`}
              </span>
              {trendLabel && <span className="text-xs text-charcoal-400">{trendLabel}</span>}
            </div>
          )}
          {footer}
        </div>
      )}
    </div>
  );
}

export function TrendBadge({ value }: { value: number }) {
  if (value >= 0) {
    return (
      <Badge variant="success" icon={<TrendingUp className="h-3 w-3" />}>
        +{value}%
      </Badge>
    );
  }
  return <Badge variant="danger">{value}%</Badge>;
}