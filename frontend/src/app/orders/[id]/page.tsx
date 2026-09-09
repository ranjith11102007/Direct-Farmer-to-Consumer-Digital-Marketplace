'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ChevronLeft,
  MapPin,
  Phone,
  Download,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PageLoader } from '@/components/ui/loading';
import { DeliveryStatus } from '@/components/delivery/delivery-status';
import { useOrder, useCancelOrder } from '@/hooks/useApi';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { formatCurrency, formatDate, formatTime, getInitials } from '@/lib/utils';
import { useState } from 'react';
import type { Delivery } from '@/types';

const MOCK_DELIVERY: Delivery = {
  id: 'd1',
  orderId: 'o1',
  orderNumber: 'VAX26090000',
  deliveryPartnerId: 'D-4521',
  status: 'out_for_delivery',
  currentLocation: { type: 'Point', coordinates: [78.6, 10.8] },
  timeline: [],
  estimatedDeliveryTime: new Date(Date.now() + 4 * 3600000).toISOString(),
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const language = useUIStore((state) => state.language);
  const orderId = params.id;
  const cancelOrder = useCancelOrder();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading) {
    return (
      <>
        <PromoStrip />
        <Header />
        <main className="mx-auto min-h-[60vh] max-w-5xl px-4 py-8">
          <PageLoader />
        </main>
        <Footer />
        <MobileNav />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <PromoStrip />
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-16 text-center">
          <p className="text-lg text-charcoal-500">{t('error.notFound', language)}</p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => router.push('/orders')}>{t('error.backHome', language)}</Button>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </>
    );
  }

  const isCancelled = order.orderStatus === 'cancelled';
  const isDelivered = order.orderStatus === 'delivered';

  const handleCancel = async () => {
    await cancelOrder.mutateAsync({ id: order.id, reason: cancelReason || 'Other' });
    setCancelOpen(false);
    router.refresh();
  };

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <button onClick={() => router.push('/orders')} className="mb-4 flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">
          <ChevronLeft className="h-4 w-4" /> {t('common.back', language)}
        </button>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-charcoal-800">
              {t('orderDetail.title', language)} #{order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-charcoal-500">
              {t('orders.orderDate', language)}: {formatDate(order.createdAt, true)}
            </p>
          </div>
          <Badge variant={isDelivered ? 'success' : isCancelled ? 'danger' : 'primary'}>
            {t(`orders.${order.orderStatus}`, language)}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <DeliveryStatus
              delivery={{ ...MOCK_DELIVERY, status: order.orderStatus === 'delivered' ? 'delivered' : 'out_for_delivery' }}
              order={order}
            />

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('orderDetail.itemsOrdered', language)}</h2>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-charcoal-50 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {getInitials(item.productName)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-charcoal-800">{item.productName}</p>
                        <p className="text-xs text-charcoal-400">
                          {item.quantity} {item.unit} × {formatCurrency(item.pricePerUnit)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-charcoal-800">{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('orderDetail.paymentSummary', language)}</h2>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-charcoal-500">{t('cart.subtotal', language)}</span><span>{formatCurrency(order.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-charcoal-500">{t('cart.deliveryFee', language)}</span><span>{formatCurrency(order.deliveryFee)}</span></div>
                <div className="flex justify-between"><span className="text-charcoal-500">{t('cart.platformFee', language)}</span><span>{formatCurrency(order.platformFee)}</span></div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600"><span>{t('cart.savings', language)}</span><span>−{formatCurrency(order.discount)}</span></div>
                )}
                <div className="flex justify-between border-t border-dashed border-charcoal-200 pt-2 text-base font-bold text-charcoal-800">
                  <span>{t('orders.total', language)}</span><span>{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-primary-50 px-2 py-1.5 text-xs text-primary-700">
                  <span>{t('cart.estimatedFarmerShare', language)}</span><span className="font-bold">{formatCurrency(order.farmerShare)}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('orderDetail.deliveryAddress', language)}</h2>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-charcoal-700">{order.deliveryAddress.label}</p>
                  <p className="text-sm text-charcoal-500">
                    {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city} {order.deliveryAddress.state} {order.deliveryAddress.pincode}
                  </p>
                  {order.deliverySlot && (
                    <p className="mt-1 text-xs text-charcoal-400">
                      {formatDate(order.deliverySlot.date)} • {order.deliverySlot.startTime} - {order.deliverySlot.endTime}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="lg:sticky lg:top-24">
              <h3 className="text-sm font-semibold text-charcoal-800">{t('orders.help', language)}</h3>
              <div className="mt-3 space-y-2">
                <a
                  href="tel:+911800123456"
                  className="flex items-center gap-2 rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-medium text-charcoal-700 transition-colors hover:border-primary-300"
                >
                  <Phone className="h-4 w-4 text-primary-600" /> 1800-123-456
                </a>
                <Button variant="outline" size="sm" fullWidth onClick={() => toastForDownload()}>
                  <Download className="h-4 w-4" /> {t('orders.exportInvoice', language)}
                </Button>
              </div>

              <div className="mt-4 border-t border-charcoal-100 pt-4 space-y-3">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-600" />
                  <p className="text-xs text-charcoal-600">{t('productDetail.qualityChecked', language)}</p>
                </div>
                <div className="flex gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-primary-600" />
                  <p className="text-xs text-charcoal-600">{t('productDetail.moneyBackGuarantee', language)}</p>
                </div>
                <div className="flex gap-2">
                  <RotateCcw className="h-4 w-4 shrink-0 text-primary-600" />
                  <p className="text-xs text-charcoal-600">{t('productDetail.returnPolicy', language)}</p>
                </div>
              </div>

              {!isCancelled && !isDelivered && (
                <Button variant="danger" size="sm" fullWidth className="mt-4" onClick={() => setCancelOpen(true)}>
                  {t('orders.cancelOrder', language)}
                </Button>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t('orders.cancelTitle', language)}
        subtitle={t('orders.cancelDescription', language)}
      >
        <div className="space-y-3">
          <select
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full rounded-lg border border-charcoal-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">{t('orders.cancellationReason', language)}</option>
            {['Changed my mind', 'Delivery too late', 'Found better price', 'Quality concerns'].map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>{t('orders.keepOrder', language)}</Button>
            <Button variant="danger" onClick={handleCancel} loading={cancelOrder.isPending}>
              {t('orders.cancelConfirm', language)}
            </Button>
          </div>
        </div>
      </Modal>

      <Footer />
      <MobileNav />
    </>
  );
}

function toastForDownload() {
  const { toast } = require('sonner') as typeof import('sonner');
  toast.info('Invoice will be emailed to you');
}