'use client';

import { Badge } from '@/components/ui/badge';
import { cn, formatTime } from '@/lib/utils';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { Phone, MapPin, Package, ChevronRight } from 'lucide-react';
import type { RouteStop } from '@/types';

export interface RouteStopsProps {
  stops: RouteStop[];
  currentIndex?: number;
  onMarkReached?: (stop: RouteStop) => void;
  onMarkDelivered?: (stop: RouteStop) => void;
  onMarkFailed?: (stop: RouteStop) => void;
  onSkip?: (stop: RouteStop) => void;
  onNavigate?: (stop: RouteStop) => void;
  onCall?: (stop: RouteStop) => void;
}

const statusVariant = {
  pending: 'neutral' as const,
  reached: 'info' as const,
  delivered: 'success' as const,
  failed: 'danger' as const,
  skipped: 'neutral' as const,
};

export function RouteStops({
  stops,
  currentIndex = -1,
  onMarkReached,
  onMarkDelivered,
  onMarkFailed,
  onSkip,
  onNavigate,
  onCall,
}: RouteStopsProps) {
  const language = useUIStore((state) => state.language);

  const completedCount = stops.filter((s) => s.status === 'delivered').length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-charcoal-500">
          {t('delivery.completed', language)}: <b className="text-primary-700">{completedCount}/{stops.length}</b>
        </p>
        <div className="flex gap-2">
          {stops.slice(0, 4).map((stop, index) => (
            <span
              key={stop.orderId}
              className={cn(
                'h-2 w-2 rounded-full',
                stop.status === 'delivered' ? 'bg-green-500' : index === currentIndex ? 'bg-accent-500' : 'bg-charcoal-200'
              )}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {stops.map((stop, index) => {
          const isCurrent = index === currentIndex;
          return (
            <div
              key={stop.orderId}
              className={cn(
                'rounded-xl border p-3 transition-all',
                isCurrent
                  ? 'border-accent-300 bg-accent-50'
                  : stop.status === 'delivered'
                    ? 'border-green-200 bg-green-50/60'
                    : 'border-charcoal-200 bg-white'
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    stop.status === 'delivered'
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-accent-500 text-white'
                        : 'bg-charcoal-200 text-charcoal-600'
                  )}
                >
                  {stop.sequence}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-sm font-semibold text-charcoal-800">
                      {t('delivery.orderNumber', language)} {stop.orderNumber}
                    </p>
                    <Badge variant={statusVariant[stop.status]}>
                      {t(`delivery.${stop.status === 'pending' ? 'dashboard' : stop.status}`, language) === `delivery.${stop.status}` ? stop.status : t(`delivery.${stop.status}`, language)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 flex items-start gap-1 text-xs text-charcoal-500">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>
                      {stop.address.addressLine1}, {stop.address.city} {stop.address.pincode}
                    </span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-charcoal-500">
                    {stop.contactName && (
                      <>
                        <span className="font-medium text-charcoal-700">{stop.contactName}</span>
                        {stop.contactPhone && <span>{stop.contactPhone}</span>}
                      </>
                    )}
                    <span className="ml-auto">{formatTime(stop.estimatedArrival)}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-charcoal-400">
                    <Package className="h-3 w-3" />
                    {stop.itemsSummary}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate(stop)}
                        className="rounded-lg bg-primary-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-primary-700"
                      >
                        {t('delivery.stopNavigation', language)}
                      </button>
                    )}
                    {onCall && stop.contactPhone && (
                      <button
                        onClick={() => onCall(stop)}
                        className="rounded-lg border border-primary-300 px-2.5 py-1 text-[11px] font-medium text-primary-700 transition-colors hover:bg-primary-50"
                      >
                        <Phone className="mr-1 inline h-3 w-3" /> {t('orderDetail.contactPartner', language)}
                      </button>
                    )}
                    {isCurrent && onMarkReached && stop.status === 'pending' && (
                      <button
                        onClick={() => onMarkReached(stop)}
                        className="rounded-lg border border-charcoal-300 px-2.5 py-1 text-[11px] font-medium text-charcoal-700 transition-colors hover:bg-charcoal-50"
                      >
                        {t('delivery.arrived', language)}
                      </button>
                    )}
                    {stop.status === 'reached' && onMarkDelivered && (
                      <button
                        onClick={() => onMarkDelivered(stop)}
                        className="rounded-lg bg-green-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-green-700"
                      >
                        {t('delivery.delivered', language)}
                      </button>
                    )}
                    {stop.status === 'reached' && onMarkFailed && (
                      <button
                        onClick={() => onMarkFailed(stop)}
                        className="rounded-lg border border-red-300 px-2.5 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        {t('delivery.failed', language)}
                      </button>
                    )}
                    {stop.status !== 'delivered' && onSkip && (
                      <button
                        onClick={() => onSkip(stop)}
                        className="ml-auto rounded-lg px-2 py-1 text-[11px] text-charcoal-400 transition-colors hover:text-charcoal-600"
                      >
                        {t('delivery.skipStop', language)} <ChevronRight className="inline h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}