'use client';

import { CheckCircle2, LocateFixed, Truck, Snowflake, Warehouse, Home, XCircle, type LucideIcon } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn, formatDate, formatTime } from '@/lib/utils';
import type { TraceabilityEvent } from '@/types';

const STATUS_META: Record<string, { icon: LucideIcon; label: string }> = {
  harvested: { icon: CheckCircle2, label: 'harvested' },
  collected: { icon: Truck, label: 'collected' },
  in_cold_storage: { icon: Snowflake, label: 'in_cold_storage' },
  in_transit: { icon: Truck, label: 'in_transit' },
  at_dc: { icon: Warehouse, label: 'at_dc' },
  out_for_delivery: { icon: Truck, label: 'out_for_delivery' },
  delivered: { icon: Home, label: 'delivered' },
  rejected: { icon: XCircle, label: 'rejected' },
};

export interface TraceabilityTimelineProps {
  events: TraceabilityEvent[];
  productName?: string;
  batchNumber?: string;
  farmerName?: string;
  farmLocation?: string;
}

export function TraceabilityTimeline({
  events,
  productName,
  batchNumber,
  farmerName,
  farmLocation,
}: TraceabilityTimelineProps) {
  const language = useUIStore((state) => state.language);

  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="rounded-xl border border-charcoal-100 bg-white">
      <div className="border-b border-charcoal-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-charcoal-800">{t('productDetail.traceability', language)}</h3>
        <p className="mt-0.5 text-xs text-charcoal-500">{t('productDetail.traceTimeline', language)}</p>
      </div>

      <div className="p-4">
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-charcoal-600">
          {productName && (
            <span className="rounded-full bg-primary-50 px-2.5 py-1 font-medium text-primary-700">{productName}</span>
          )}
          {batchNumber && (
            <span className="rounded-full bg-charcoal-100 px-2.5 py-1 font-medium text-charcoal-600">{batchNumber}</span>
          )}
          {farmerName && (
            <span className="rounded-full bg-secondary-100 px-2.5 py-1 font-medium text-secondary-700">{farmerName}</span>
          )}
          {farmLocation && (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700">{farmLocation}</span>
          )}
        </div>

        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-charcoal-400">{t('common.noData', language)}</p>
        ) : (
          <ol className="relative space-y-0">
            {sorted.map((event, index) => {
              const isLast = index === sorted.length - 1;
              const meta = STATUS_META[event.status] ?? { icon: LocateFixed, label: event.status };
              const Icon = meta.icon;
              const isDelivered = event.status === 'delivered';
              const isRejected = event.status === 'rejected';

              return (
                <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                        isDelivered
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : isRejected
                            ? 'border-red-400 bg-red-500 text-white'
                            : 'border-primary-300 bg-white text-primary-600'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {!isLast && <span className="mt-1 w-0.5 flex-1 bg-charcoal-200" />}
                  </div>

                  <div className={cn('flex-1 pt-0.5', !isLast && 'pb-2')}>
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <p className={cn('text-sm font-semibold', isDelivered ? 'text-primary-700' : 'text-charcoal-800')}>
                        {meta.label === event.status
                          ? event.status.replace(/_/g, ' ')
                          : meta.label.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-charcoal-400">
                        {formatDate(event.timestamp)} • {formatTime(event.timestamp)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-charcoal-500">{event.description}</p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-charcoal-400">
                      <LocateFixed className="h-3 w-3" />
                      {event.location}
                      <span className="mx-1">•</span>
                      {event.operator}
                    </p>
                    {event.verified && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}