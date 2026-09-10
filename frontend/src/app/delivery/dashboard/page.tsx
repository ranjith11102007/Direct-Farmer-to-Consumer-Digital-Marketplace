'use client';

import { useState } from 'react';
import {
  Navigation2,
  Truck,
  PackageCheck,
  TrendingUp,
  MapPin,
  Clock,
  Phone,
} from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { RoleGuard } from '@/components/auth/role-guard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { RouteMap } from '@/components/ai/route-map';
import { RouteStops } from '@/components/delivery/route-stops';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatTime } from '@/lib/utils';
import type { DeliveryRoute, RouteStop } from '@/types';

const MOCK_ROUTE: DeliveryRoute = {
  id: 'r1',
  deliveryPartnerId: 'D-4521',
  date: '2026-09-09T00:00:00.000Z',
  zone: 'Chennai - Tambaram',
  stops: [
    {
      orderId: 'o1',
      orderNumber: 'VAX26090001',
      sequence: 1,
      address: { id: 'a1', label: 'home', addressLine1: '4, Gandhi Road', city: 'Chennai', district: 'Chengalpattu', state: 'TN', pincode: '600045' },
      status: 'delivered',
      distanceFromPrevKm: 0,
      estimatedArrival: '2026-09-09T07:15:00.000Z',
      contactName: 'Ranjith',
      contactPhone: '9840512345',
      itemsSummary: 'Tomato (2kg), Brinjal (1kg)',
      packagesCount: 3,
    },
    {
      orderId: 'o2',
      orderNumber: 'VAX26090004',
      sequence: 2,
      address: { id: 'a2', label: 'home', addressLine1: '12, Lake View Colony', city: 'Chennai', district: 'Chengalpattu', state: 'TN', pincode: '600100' },
      status: 'reached',
      distanceFromPrevKm: 2.4,
      estimatedArrival: '2026-09-09T07:45:00.000Z',
      contactName: 'Priya',
      contactPhone: '9087644332',
      itemsSummary: 'Milk (3L), Eggs (12), Spinach (500g)',
      packagesCount: 4,
    },
    {
      orderId: 'o3',
      orderNumber: 'VAX26090007',
      sequence: 3,
      address: { id: 'a3', label: 'office', addressLine1: '85, GST Road', city: 'Chennai', district: 'Chengalpattu', state: 'TN', pincode: '600097' },
      status: 'pending',
      distanceFromPrevKm: 3.1,
      estimatedArrival: '2026-09-09T08:20:00.000Z',
      contactName: 'Kumar',
      contactPhone: '9842123456',
      itemsSummary: 'Bulk: Rice (10kg), Pulses (5kg)',
      packagesCount: 6,
    },
    {
      orderId: 'o4',
      orderNumber: 'VAX26090009',
      sequence: 4,
      address: { id: 'a4', label: 'home', addressLine1: '23, East Avenue', city: 'Chennai', district: 'Chengalpattu', state: 'TN', pincode: '600073' },
      status: 'pending',
      distanceFromPrevKm: 1.8,
      estimatedArrival: '2026-09-09T08:45:00.000Z',
      contactName: 'Meena',
      contactPhone: '9097123456',
      itemsSummary: 'Banana (2dozen), Curd (1L)',
      packagesCount: 2,
    },
  ] as unknown as RouteStop[],
  status: 'active',
  startTime: '2026-09-09T06:00:00.000Z',
  totalStops: 4,
  completedStops: 1,
  currentStopIndex: 1,
  totalDistanceKm: 7.3,
  avgStopDurationMins: 12,
  createdAt: '2026-09-08T18:00:00.000Z',
};

export default function DeliveryDashboardPage() {
  const language = useUIStore((state) => state.language);
  const [stops, setStops] = useState<RouteStop[]>(MOCK_ROUTE.stops);
  const [currentIndex, setCurrentIndex] = useState(MOCK_ROUTE.currentStopIndex ?? 1);
  const [proofOpen, setProofOpen] = useState(false);

  const completedCount = stops.filter((s) => s.status === 'delivered').length;
  const currentStop = stops[currentIndex];

  const mark = (stop: RouteStop, status: RouteStop['status']) => {
    setStops((prev) => prev.map((s) => (s.orderId === stop.orderId ? { ...s, status } : s)));
    if (status === 'delivered') setCurrentIndex((i) => Math.min(i + 1, stops.length - 1));
  };

  return (
    <>
      <PromoStrip />
      <Header />
      <RoleGuard roles={['delivery_partner', 'admin']} redirectTo="/producer/dashboard">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-orange-700 text-white">
              <Truck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-charcoal-800">{t('delivery.dashboard', language)}</h1>
              <p className="text-sm text-charcoal-500">
                {MOCK_ROUTE.zone} • {t('delivery.partner', language)}: {MOCK_ROUTE.deliveryPartnerId}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="success" icon={<Navigation2 className="h-3 w-3" />}>
              {t('delivery.routeActive', language)}
            </Badge>
            <Button variant="outline" size="sm">
              <Phone className="h-3.5 w-3.5" /> {t('orderDetail.contactPartner', language)}
            </Button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={PackageCheck} label={t('delivery.stopsCompleted', language)} value={`${completedCount}/${stops.length}`} />
          <StatTile icon={Navigation2} label={t('delivery.distance', language)} value={`${MOCK_ROUTE.totalDistanceKm} km`} accent="accent" />
          <StatTile icon={Clock} label={t('delivery.progress', language)} value={`${Math.round((completedCount / stops.length) * 100)}%`} />
          <StatTile icon={MapPin} label={t('delivery.nextStop', language)} value={currentStop ? `#${currentStop.sequence}` : '—'} accent="violet" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal-800">{t('delivery.liveRoute', language)}</h2>
              <span className="text-xs text-charcoal-400">{t('delivery.eta', language)}: {formatTime(MOCK_ROUTE.stops[currentIndex]?.estimatedArrival ?? '')}</span>
            </div>
            <RouteMap
              origin={{ label: 'Vaikkal DC - Tambaram' }}
              stops={stops.map((s, index) => ({ label: `O${s.orderNumber.slice(-2)}`, status: s.status }) as never)}
              currentStop={currentIndex}
            />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('delivery.optimizedRoute', language)}</h2>
            <RouteStops
              stops={stops}
              currentIndex={currentIndex}
              onMarkReached={(stop) => mark(stop, 'reached')}
              onMarkDelivered={(stop) => {
                mark(stop, 'delivered');
                setProofOpen(true);
              }}
              onMarkFailed={(stop) => mark(stop, 'failed')}
              onSkip={(stop) => mark(stop, 'skipped')}
              onNavigate={() => {}}
              onCall={(stop) => {
                if (stop.contactPhone) window.open(`tel:${stop.contactPhone}`);
              }}
            />
          </Card>
        </div>

        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-charcoal-800">{t('delivery.todayEarnings', language)}</h2>
              <p className="mt-1 text-xs text-charcoal-500">{t('delivery.earningsNote', language)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success" icon={<TrendingUp className="h-3 w-3" />}>
                +18% {t('delivery.vsYesterday', language)}
              </Badge>
              <span className="text-lg font-bold text-charcoal-800">{formatCurrency(840)}</span>
            </div>
          </div>
        </Card>
      </main>

      <Modal
        open={proofOpen}
        onClose={() => setProofOpen(false)}
        title={t('delivery.proofTitle', language)}
        subtitle={t('delivery.proofSubtitle', language)}
      >
        <label className="mb-1.5 block text-sm font-medium text-charcoal-700">{t('delivery.receivedBy', language)}</label>
        <input placeholder="Customer name" className="mb-3 w-full rounded-lg border border-charcoal-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
        <label className="mb-1.5 block text-sm font-medium text-charcoal-700">{t('delivery.signature', language)}</label>
        <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-charcoal-300 text-xs text-charcoal-400">
          {t('delivery.signatureBox', language)}
        </div>
        <Button fullWidth className="mt-4" onClick={() => setProofOpen(false)}>
          <PackageCheck className="h-4 w-4" /> {t('delivery.confirmDelivery', language)}
        </Button>
      </Modal>

      </RoleGuard>
      <Footer />
      <MobileNav />
    </>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent = 'primary',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: 'primary' | 'accent' | 'violet';
}) {
  const tones = {
    primary: 'from-primary-500 to-primary-700',
    accent: 'from-accent-500 to-orange-700',
    violet: 'from-violet-500 to-purple-700',
  };
  return (
    <Card className="flex items-center gap-3 py-4">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white', tones[accent])}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{label}</p>
        <p className="text-lg font-bold text-charcoal-800">{value}</p>
      </div>
    </Card>
  );
}