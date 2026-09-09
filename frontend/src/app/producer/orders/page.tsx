'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Check, X, Package, ShoppingCart } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useOrders } from '@/hooks/useApi';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { OrderStatus } from '@/types';

const ROLE_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'processing', 'packed', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'];

export default function ProducerOrdersPage() {
  const language = useUIStore((state) => state.language);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');

  const { data, isLoading } = useOrders({ mine: true, status: status === 'all' ? undefined : status, page, per_page: 8 });
  const orders = data?.items ?? [];

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-charcoal-800">{t('producer.orders', language)}</h1>
          <p className="mt-1 text-sm text-charcoal-500">{t('producer.ordersSubtitle', language)}</p>
        </div>

        <Tabs
          variant="pill"
          activeKey={status}
          onChange={(key) => {
            setStatus(key as OrderStatus | 'all');
            setPage(1);
          }}
          tabs={[
            { key: 'all', label: t('orders.all', language) },
            ...ROLE_STATUSES.map((s) => ({ key: s, label: t(`orders.${s}`, language) })),
          ]}
        />

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="animate-pulse rounded-xl border border-charcoal-100 p-5">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-1/4 rounded bg-charcoal-100" />
                    <div className="h-4 w-1/6 rounded bg-charcoal-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              title={t('producer.noOrders', language)}
              description={t('producer.noOrdersSubtitle', language)}
              icon={<ShoppingCart className="h-7 w-7" />}
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const isNew = order.orderStatus === 'placed' || order.orderStatus === 'confirmed';
                return (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <Card hoverable>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full',
                            isNew ? 'bg-accent-100 text-accent-600' : 'bg-primary-100 text-primary-600'
                          )}>
                            {isNew ? <Check className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-charcoal-800">
                              #{order.orderNumber}
                              {isNew && <Badge variant="danger" className="ml-2">{t('producer.actionNeeded', language)}</Badge>}
                            </p>
                            <p className="text-xs text-charcoal-500">
                              {formatDate(order.createdAt)} • {order.items.length} {t('producer.itemTypes', language)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-charcoal-800">{formatCurrency(order.totalAmount)}</p>
                            <p className="text-[11px] text-primary-700">{t('cart.estimatedFarmerShare', language)}: {formatCurrency(order.farmerShare)}</p>
                          </div>
                          <Badge variant={isNew ? 'warning' : 'info'}>
                            {t(`orders.${order.orderStatus}`, language)}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-charcoal-300" />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-charcoal-100 pt-3">
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
                <div className="mt-4">
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