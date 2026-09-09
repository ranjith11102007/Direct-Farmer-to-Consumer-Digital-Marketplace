'use client';

import { Check, Truck, Warehouse, Home, Package, XCircle, type LucideIcon } from 'lucide-react';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import type { Delivery, OrderStatus } from '@/types';

export interface DeliveryStatusProps {
  delivery: Delivery;
  order?: {
    orderNumber: string;
    timeline?: Array<{ status: OrderStatus; timestamp: string; title: string; description: string; location?: string }>;
  };
}

const DELIVERY_STEPS: Array<{ key: string; icon: LucideIcon }> = [
  { key: 'placed', icon: Check },
  { key: 'packed', icon: Package },
  { key: 'inTransit', icon: Warehouse },
  { key: 'outForDelivery', icon: Truck },
  { key: 'delivered', icon: Home },
];

type TimelineEvent = { id?: string; status: OrderStatus; timestamp: string; title: string; description?: string; location?: string };

export function DeliveryStatus({ delivery, order }: DeliveryStatusProps) {
  const language = useUIStore((state) => state.language);

  const statusIndex = DELIVERY_STEPS.findIndex((step) => step.key === delivery.status);
  const currentIndex = statusIndex >= 0 ? statusIndex : 1;

  const timeline: TimelineEvent[] = order?.timeline?.length
    ? order.timeline.map((event, index) => ({ ...event, id: String(index) }))
    : Array.from({ length: DELIVERY_STEPS.length }).map((_, index) => ({
        id: String(index),
        status: DELIVERY_STEPS[index].key as OrderStatus,
        timestamp: new Date(Date.now() - (DELIVERY_STEPS.length - index) * 3600_000).toISOString(),
        title: t(`orderDetail.statusTimeline.${DELIVERY_STEPS[index].key}`, language),
        description: '',
      }));

  return (
    <div className="rounded-xl border border-charcoal-200/70 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-charcoal-800">{t('delivery.tracking', language)}</h3>
          {order?.orderNumber && <p className="text-xs text-charcoal-500">#{order.orderNumber}</p>}
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-[11px] font-semibold',
            delivery.status === 'delivered'
              ? 'bg-green-100 text-green-700'
              : delivery.status === 'failed' || delivery.status === 'returned'
                ? 'bg-red-100 text-red-600'
                : 'bg-primary-100 text-primary-700'
          )}
        >
          {t(`delivery.${delivery.status}`, language) === `delivery.${delivery.status}`
            ? delivery.status.replace(/_/g, ' ')
            : t(`delivery.${delivery.status}`, language)}
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 h-full w-0.5 bg-charcoal-200" aria-hidden="true" />
        <ol className="space-y-4">
          {timeline.map((event, index) => {
            const stepMeta = DELIVERY_STEPS.find((step) => step.key === event.status) ?? DELIVERY_STEPS[0];
            const Icon = stepMeta.icon;
            const isDone = index <= currentIndex;
            const isLatest = index === currentIndex;

            return (
              <li key={event.id ?? index} className="relative flex gap-3 pl-0">
                <span
                  className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                    isDone
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-charcoal-200 bg-white text-charcoal-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className={cn('min-w-0 flex-1 pt-0.5', isLatest && 'rounded-lg border border-primary-100 bg-primary-50/60 px-3 py-2')}>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className={cn('text-sm font-semibold', isDone ? 'text-charcoal-800' : 'text-charcoal-400')}>
                      {event.title}
                    </p>
                    {event.timestamp && (
                      <p className="text-xs text-charcoal-400">
                        {formatDate(event.timestamp)} • {formatTime(event.timestamp)}
                      </p>
                    )}
                  </div>
                  {event.description && (
                    <p className="mt-0.5 text-xs text-charcoal-500">{event.description}</p>
                  )}
                  {event.location && (
                    <p className="mt-0.5 text-[11px] text-charcoal-400">📍 {event.location}</p>
                  )}
                  {isLatest && delivery.deliveryPartnerId && (
                    <p className="mt-1 text-[11px] font-medium text-primary-700">
                      {t('orderDetail.deliveryPartner', language)}: #{delivery.deliveryPartnerId}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {delivery.status === 'delivered' && delivery.deliveredAt && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5">
          <Check className="h-4 w-4 shrink-0 text-green-600" />
          <p className="text-xs font-medium text-green-700">
            {t('orderDetail.deliveredAt', language)}: {formatDate(delivery.deliveredAt)} • {formatTime(delivery.deliveredAt)}
          </p>
        </div>
      )}
      {delivery.status === 'failed' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5">
          <XCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-xs font-medium text-red-600">{t('delivery.failed', language)}</p>
        </div>
      )}
    </div>
  );
}