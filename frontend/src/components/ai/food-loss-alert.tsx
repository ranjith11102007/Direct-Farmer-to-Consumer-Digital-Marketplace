'use client';

import { AlertTriangle, ShieldAlert, XCircle, Sprout } from 'lucide-react';
import { cn, formatWeight, truncateText } from '@/lib/utils';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

export type FoodLossSeverity = 'low' | 'medium' | 'high';

export interface FoodLossAlertProps {
  productName: string;
  quantityLeavingValue: number;
  estimatedLossKg: number;
  severity: FoodLossSeverity;
  reason: string;
  recommendedAction?: string;
  onDismiss?: () => void;
  onResolve?: () => void;
}

const severityStyles: Record<FoodLossSeverity, { icon: ReactNode; container: string; badge: string; label: string }> = {
  low: {
    icon: <Sprout className="h-4 w-4" />,
    container: 'border-yellow-200 bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-800',
    label: 'low',
  },
  medium: {
    icon: <AlertTriangle className="h-4 w-4" />,
    container: 'border-orange-200 bg-orange-50',
    badge: 'bg-orange-100 text-orange-800',
    label: 'medium',
  },
  high: {
    icon: <ShieldAlert className="h-4 w-4" />,
    container: 'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-800',
    label: 'high',
  },
};

export function FoodLossAlert({
  productName,
  quantityLeavingValue,
  estimatedLossKg,
  severity,
  reason,
  recommendedAction,
  onDismiss,
  onResolve,
}: FoodLossAlertProps) {
  const language = useUIStore((state) => state.language);
  const styles = severityStyles[severity];

  return (
    <div className={cn('rounded-xl border p-4', styles.container)} role="alert">
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', styles.badge)}>
          {styles.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-charcoal-800">{productName}</h3>
              <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', styles.badge)}>
                {severity} risk
              </span>
            </div>
            <p className="text-right">
              <span className="block text-lg font-bold text-charcoal-800">{formatWeight(estimatedLossKg * 1000)}</span>
              <span className="text-xs text-charcoal-500">est. loss</span>
            </p>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-xs text-charcoal-600">
            <XCircle className="h-3.5 w-3.5 shrink-0 text-charcoal-400" />
            {truncateText(reason, 90)}
          </p>

          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-charcoal-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
            {t('recommendedAction', 'en') === 'recommendedAction' ? 'Recommended action' : 'Recommended action'}: {recommendedAction}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {onResolve &&
              <Button size="sm" onClick={onResolve}>{t('common.confirm', language)}</Button>}
            {onDismiss &&
              <Button size="sm" variant="outline" onClick={onDismiss}>{t('common.close', language)}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}