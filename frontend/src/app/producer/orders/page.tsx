'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Check, X, Package, ShoppingCart, Truck } from 'lucide-react';
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
import { useUIStore, useAuthStore, useOrdersStore, useNotificationsStore, useMarketplaceStore } from '@/store';
import { apiPost } from '@/lib/api';
import { toast } from 'sonner';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { OrderStatus } from '@/types';

const ROLE_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'processing', 'packed'];

export default function ProducerOrdersPage() {
  const language = useUIStore((state) => state.language);
  const user = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');

  // Get orders from the shared store for this farmer
  const farmerOrders = useOrdersStore((s) => user ? s.getOrdersByFarmer(user.id) : []);
  const updateFarmerOrderStatus = useOrdersStore((s) => s.updateFarmerOrderStatus);
  const addNotification = useNotificationsStore((s) => s.addNotification);

  // Also fetch from API
  const { data, isLoading } = useOrders({ mine: true, status: status === 'all' ? undefined : status, page, per_page: 8 });
  const apiOrders = data?.items ?? [];

  // Combine local farmer orders with API orders
  const allOrders = [...farmerOrders.map((fo) => ({
    id: fo.id,
    orderNumber: fo.orderNumber,
    orderStatus: fo.orderStatus as OrderStatus,
    totalAmount: fo.totalAmount,
    createdAt: fo.createdAt,
    items: fo.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      pricePerUnit: item.pricePerUnit,
      totalPrice: item.pricePerUnit * item.quantity,
      farmerShareAmount: item.pricePerUnit * item.quantity * 0.7,
    })),
    farmerShare: fo.totalAmount * 0.7,
  })), ...apiOrders];

  const filteredOrders = status === 'all' ? allOrders : allOrders.filter((o) => o.orderStatus === status);

  const acceptOrder = async (orderId: string) => {
    updateFarmerOrderStatus(orderId, 'confirmed');
    toast.success('Order accepted');

    if (user) {
      addNotification({
        userId: user.id,
        title: 'Order Confirmed',
        message: `You have confirmed order #${orderId.slice(-6)}`,
        type: 'order',
        link: '/producer/orders',
        orderId,
      });
    }
  };

  const rejectOrder = async (orderId: string) => {
    updateFarmerOrderStatus(orderId, 'cancelled');
    toast.success('Order rejected');

    if (user) {
      addNotification({
        userId: user.id,
        title: 'Order Rejected',
        message: `Order #${orderId.slice(-6)} has been rejected`,
        type: 'order',
        link: '/producer/orders',
        orderId,
      });
    }
  };

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-charcoal-800">{t('producer.incomingOrders', language)}</h1>
          <p className="mt-1 text-sm text-charcoal-500">{t('producer.incomingOrdersSubtitle', language)}</p>
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
          {isLoading && filteredOrders.length === 0 ? (
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
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title={t('producer.noOrders', language)}
              description={t('producer.incomingOrdersSubtitle', language)}
              icon={<ShoppingCart className="h-7 w-7" />}
            />
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isNew = order.orderStatus === 'placed' || order.orderStatus === 'confirmed';
                const isLocal = order.id.startsWith('local-') || order.id.startsWith('fo-');
                return (
                  <Card key={order.id}>
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
                          {order.orderStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      {isNew && (
                        <div className="flex gap-2">
                           <Button size="sm" variant="outline" onClick={() => acceptOrder(order.id)} className="border-green-600 text-green-700 hover:bg-green-50">
                             <Check className="h-3 w-3 mr-1" /> Accept
                           </Button>
                          <Button size="sm" variant="danger" onClick={() => rejectOrder(order.id)}>
                            <X className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-charcoal-100 pt-3">
                      {order.items.map((item) => (
                        <span key={item.id} className="rounded-full bg-charcoal-100 px-2.5 py-1 text-[11px] text-charcoal-600">
                          {item.productName} × {item.quantity}{item.unit}
                        </span>
                      ))}
                    </div>
                  </Card>
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
