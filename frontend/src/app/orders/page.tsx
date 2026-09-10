'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, ChevronRight, Truck, ShoppingBasket, MapPin, Calendar } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { useOrders } from '@/hooks/useApi';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { OrderStatus } from '@/types';

const STATUS_VARIANTS: Record<OrderStatus, 'neutral' | 'info' | 'primary' | 'success' | 'danger'> = {
  placed: 'neutral',
  confirmed: 'info',
  processing: 'info',
  packed: 'primary',
  in_transit: 'primary',
  out_for_delivery: 'primary',
  delivered: 'success',
  cancelled: 'danger',
};

export default function OrdersPage() {
  const language = useUIStore((state) => state.language);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');

  const { data, isLoading, isError } = useOrders({
    status: status === 'all' ? undefined : status,
    page,
    per_page: 10,
  });

  const statusFilter: Array<{ key: OrderStatus | 'all'; label: string }> = [
    { key: 'all', label: t('orders.all', language) },
    { key: 'placed', label: t('orders.placed', language) },
    { key: 'confirmed', label: t('orders.confirmed', language) },
    { key: 'processing', label: t('orders.processing', language) },
    { key: 'packed', label: t('orders.packed', language) },
    { key: 'in_transit', label: t('orders.inTransit', language) },
    { key: 'out_for_delivery', label: t('orders.outForDelivery', language) },
    { key: 'delivered', label: t('orders.delivered', language) },
    { key: 'cancelled', label: t('orders.cancelled', language) },
  ];

  const orders = data?.items ?? [];

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-charcoal-800">{t('orders.title', language)}</h1>
        <p className="mt-1 text-sm text-charcoal-500">Track all your orders and deliveries</p>

        <Tabs
          variant="pill"
          className="mt-5"
          activeKey={status}
          onChange={(key) => {
            setStatus(key as OrderStatus | 'all');
            setPage(1);
          }}
          tabs={statusFilter.map(({ key, label }) => ({
            key,
            label,
            badge: key === 'all' ? data?.total : undefined,
          }))}
        />

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-xl border border-charcoal-100 p-5">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-1/4 rounded bg-charcoal-100" />
                    <div className="h-4 w-1/6 rounded bg-charcoal-100" />
                  </div>
                  <div className="mt-3 h-3 w-3/5 rounded bg-charcoal-100" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              title={t('error.somethingWentWrong', language)}
              icon={<Package className="h-7 w-7" />}
            />
          ) : orders.length === 0 ? (
            <EmptyState
              title={t('orders.empty', language)}
              description={t('orders.emptySubtitle', language)}
              icon={<Package className="h-7 w-7" />}
              action={
                <Link href="/marketplace">
                  <Button>{t('orders.browseProducts', language)}</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const isDelivered = order.orderStatus === 'delivered';
                const isCancelled = order.orderStatus === 'cancelled';
                const deliveryAddr = order.deliveryAddress;
                return (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <Card hoverable className={cn(isCancelled && 'opacity-60')}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full',
                            isDelivered ? 'bg-green-100 text-green-600' : isCancelled ? 'bg-red-100 text-red-500' : 'bg-primary-100 text-primary-600'
                          )}>
                            <Truck className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-charcoal-800">
                              <span>{order.orderNumber}</span>
                              <span className="text-xs font-normal text-charcoal-400">
                                {order.items?.reduce((sum, item) => sum + item.quantity, 0)} items
                              </span>
                            </p>
                            <p className="text-xs text-charcoal-500">
                              <Calendar className="mr-1 inline h-3 w-3" />
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-charcoal-800">{formatCurrency(order.totalAmount)}</p>
                            <Badge variant={STATUS_VARIANTS[order.orderStatus]}>
                              {order.orderStatus.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-charcoal-300" />
                        </div>
                      </div>
                      {deliveryAddr && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-charcoal-400 border-t border-charcoal-100 pt-2">
                          <MapPin className="h-3 w-3" />
                          Deliver to: {deliveryAddr.addressLine1}{deliveryAddr.district ? `, ${deliveryAddr.district}` : ''}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {order.items.map((item) => (
                          <span key={item.id} className="rounded-full bg-charcoal-100 px-2.5 py-1 text-[11px] text-charcoal-600">
                            {item.productName} × {item.quantity}{item.unit}
                          </span>
                        ))}
                      </div>
                    </Card>
                  </Link>
                );
              })}

              {data && data.totalPages > 1 && (
                <div className="mt-6">
                  <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
