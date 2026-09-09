'use client';

import { useState } from 'react';
import { ShoppingCart, Search, ChevronRight } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { OrderStatus } from '@/types';

const allStatuses: OrderStatus[] = ['placed', 'confirmed', 'processing', 'packed', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'];

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'info' | 'primary' | 'success' | 'danger'> = {
  placed: 'neutral',
  confirmed: 'info',
  processing: 'info',
  packed: 'primary',
  in_transit: 'primary',
  out_for_delivery: 'primary',
  delivered: 'success',
  cancelled: 'danger',
};

const MOCK_ORDERS: Array<{ id: string; orderNumber: string; customer: string; city: string; amount: number; status: OrderStatus; time: string; items: string }> = [
  { id: 'o1', orderNumber: 'VAX26090042', customer: 'Priya Nandhini', city: 'Chennai', amount: 846, status: 'out_for_delivery', time: '2026-09-09T06:40:00.000Z', items: 'Tomato 2kg, Milk 3L' },
  { id: 'o2', orderNumber: 'VAX26090039', customer: 'Ranjith', city: 'Chengalpattu', amount: 1220, status: 'processing', time: '2026-09-09T05:55:00.000Z', items: 'Rice 10kg, Dal 2kg' },
  { id: 'o3', orderNumber: 'VAX26090031', customer: 'Meena Krishnan', city: 'Chennai', amount: 543, status: 'packed', time: '2026-09-09T04:30:00.000Z', items: 'Banana 2dozen, Curd 1L' },
  { id: 'o4', orderNumber: 'VAX26090018', customer: 'Sun TV Cafeteria', city: 'Chennai', amount: 12480, status: 'delivered', time: '2026-09-08T08:15:00.000Z', items: 'Bulk veggies 300kg' },
];

export default function AdminOrdersPage() {
  const language = useUIStore((state) => state.language);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = MOCK_ORDERS.filter(
    (o) =>
      (status === 'all' || o.status === status) &&
      (query === '' || o.orderNumber.toLowerCase().includes(query.toLowerCase()) || o.customer.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-charcoal-800">{t('admin.orders', language)}</h1>
          <p className="mt-1 text-sm text-charcoal-500">{t('admin.monitorOrders', language)}</p>
        </div>

        <div className="mb-5">
          <SearchInput value={query} onChange={setQuery} onDebouncedChange={(v) => { setQuery(v); setPage(1); }} placeholder={t('admin.searchOrders', language)} delay={300} className="sm:w-72" />
        </div>

        <Tabs
          variant="pill"
          activeKey={status}
          onChange={(key) => { setStatus(key as OrderStatus | 'all'); setPage(1); }}
          tabs={[
            { key: 'all', label: t('orders.all', language) },
            ...allStatuses.map((s) => ({ key: s, label: t(`orders.${s}`, language) })),
          ]}
        />

        <div className="mt-6 space-y-3">
          {filtered.length === 0 ? (
            <EmptyState title={t('orders.empty', language)} icon={<ShoppingCart className="h-7 w-7" />} />
          ) : (
            filtered.map((order) => (
              <Card key={order.id} hoverable>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                    <ShoppingCart className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal-800">#{order.orderNumber}</p>
                    <p className="text-xs text-charcoal-500">
                      {order.customer} • {order.city} • {formatDate(order.time, true)} • {order.items}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-charcoal-800">{formatCurrency(order.amount)}</p>
                    <Badge variant={STATUS_VARIANT[order.status]}>
                      {t(`orders.${order.status}`, language)}
                    </Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 text-charcoal-300" />
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Pagination page={page} totalPages={4} onPageChange={setPage} />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}