'use client';

import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, formatDate, maskAccount } from '@/lib/utils';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import type { Settlement } from '@/types';

export interface SettlementCardProps {
  settlement: Settlement;
  onViewDetails?: (settlement: Settlement) => void;
  onDownload?: (settlement: Settlement) => void;
}

const statusVariant = {
  pending: 'warning' as const,
  processing: 'info' as const,
  completed: 'success' as const,
  failed: 'danger' as const,
  cancelled: 'neutral' as const,
};

export function SettlementCard({ settlement, onViewDetails, onDownload }: SettlementCardProps) {
  const language = useUIStore((state) => state.language);

  return (
    <article className="rounded-xl border border-charcoal-200/70 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-charcoal-800">{settlement.settlementNumber}</p>
          <p className="mt-0.5 text-xs text-charcoal-500">
            {formatDate(settlement.fromDate)} → {formatDate(settlement.toDate)}
          </p>
        </div>
        <Badge variant={statusVariant[settlement.status]}>
          {t(`settlements.${settlement.status}`, language)}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t('settlements.totalSales', language)} value={formatCurrency(settlement.totalSales)} />
        <Stat label={t('settlements.ordersCount', language)} value={String(settlement.ordersCount)} />
        <Stat label={t('settlements.commission', language)} value={`−${formatCurrency(settlement.commission)}`} className="text-accent-600" />
        <Stat label={t('settlements.netAmount', language)} value={formatCurrency(settlement.netAmount)} highlight />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-charcoal-500">
          {t('settlements.paymentTo', language)}: <b className="text-charcoal-700">{maskAccount(settlement.bankAccount.accountNumberMasked)}</b>
          <span className="mx-1">•</span>
          {settlement.bankAccount.ifsc}
        </p>
        <div className="flex gap-2">
          {onDownload && (
            <button
              onClick={() => onDownload(settlement)}
              className="rounded-lg border border-charcoal-200 px-3 py-1.5 text-xs font-medium text-charcoal-600 transition-colors hover:border-primary-300 hover:text-primary-700"
            >
              {t('orders.exportInvoice', language)}
            </button>
          )}
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(settlement)}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
            >
              {t('settlements.viewDetails', language)}
            </button>
          )}
        </div>
      </div>

      {settlement.status === 'processing' && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-charcoal-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-primary-500" />
          </div>
        </div>
      )}
    </article>
  );
}

function Stat({ label, value, highlight = false, className }: { label: string; value: string; highlight?: boolean; className?: string }) {
  return (
    <div className="rounded-lg bg-charcoal-50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400">{label}</p>
      <p className={cn('mt-0.5 text-sm font-bold', highlight ? 'text-primary-700' : 'text-charcoal-800', className)}>
        {value}
      </p>
    </div>
  );
}