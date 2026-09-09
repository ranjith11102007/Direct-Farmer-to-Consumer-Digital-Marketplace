'use client';

import Link from 'next/link';
import {
  Users,
  ShoppingCart,
  Package,
  Wallet,
  TrendingUp,
  Truck,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Star,
} from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MetricsCard } from '@/components/admin/metrics-card';
import { VerificationQueue } from '@/components/admin/verification-queue';
import { DemandChart } from '@/components/ai/demand-chart';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency } from '@/lib/utils';
import type { User } from '@/types';

const MOCK_PENDING_USERS: Array<User & { kycType?: string; submittedAt?: string }> = [
  {
    id: 'u1',
    name: 'Kasirajan Murugan',
    phoneNumber: '9962987345',
    role: 'farmer',
    status: 'pending',
    language: 'ta',
    kycStatus: 'submitted',
    kycType: 'Aadhaar',
    submittedAt: '2026-09-08T09:12:00.000Z',
    registeredAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'u2',
    name: 'Annadurai Cooperative FPO',
    phoneNumber: '9047782312',
    role: 'fpo',
    status: 'pending',
    language: 'en',
    kycStatus: 'submitted',
    kycType: 'Registration + GST',
    submittedAt: '2026-09-08T11:40:00.000Z',
    registeredAt: '2026-09-04T00:00:00.000Z',
  },
  {
    id: 'u3',
    name: 'Vijay Anand',
    phoneNumber: '9842356189',
    role: 'delivery_partner',
    status: 'pending',
    language: 'ta',
    kycStatus: 'submitted',
    kycType: 'Driving Licence + Aadhaar',
    submittedAt: '2026-09-09T06:05:00.000Z',
    registeredAt: '2026-09-06T00:00:00.000Z',
  },
];

export default function AdminDashboardPage() {
  const language = useUIStore((state) => state.language);

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-charcoal-800">{t('admin.dashboard', language)}</h1>
            <p className="mt-1 text-sm text-charcoal-500">{t('admin.welcome', language)}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="warning" icon={<AlertTriangle className="h-3 w-3" />}>
              {t('admin.attentionTasks', language)}: 4
            </Badge>
            <Link href="/admin/analytics">
              <Button variant="outline" size="sm">
                {t('admin.viewAnalytics', language)} <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricsCard
            label={t('admin.totalUsers', language)}
            value="12,480"
            icon={Users}
            trend={12.4}
            trendLabel={t('admin.moM', language)}
          />
          <MetricsCard
            label={t('admin.ordersToday', language)}
            value="1,206"
            icon={ShoppingCart}
            trend={8.2}
            trendLabel={t('admin.vsYesterday', language)}
            accent="from-accent-500 to-orange-700"
          />
          <MetricsCard
            label={t('admin.gmvThisMonth', language)}
            value={formatCurrency(1894000)}
            icon={TrendingUp}
            trend={15.1}
            trendLabel={t('admin.moM', language)}
            accent="from-emerald-600 to-teal-700"
          />
          <MetricsCard
            label={t('admin.pendingPayouts', language)}
            value={formatCurrency(242000)}
            icon={Wallet}
            trend={-4.3}
            trendLabel={t('admin.vsLastCycle', language)}
            accent="from-violet-500 to-purple-700"
            footer={
              <Link href="/admin/settlements" className="text-[11px] font-medium text-primary-700 hover:underline">
                {t('admin.reviewSettlements', language)} →
              </Link>
            }
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal-800">{t('admin.marketTrends', language)}</h2>
              <Link href="/admin/forecasts" className="text-xs font-medium text-primary-700 hover:underline">
                {t('common.viewAll', language)}
              </Link>
            </div>
            <DemandChart height={280} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('admin.operations', language)}</h2>
            <div className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs font-semibold text-primary-800">
                <Truck className="h-4 w-4" /> {t('delivery.routesActive', language)}
              </span>
              <span className="text-base font-bold text-primary-700">14</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-charcoal-50 px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs font-semibold text-charcoal-700">
                <Package className="h-4 w-4" /> {t('admin.pendingApprovals', language)}
              </span>
              <span className="text-base font-bold text-charcoal-800">9</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-charcoal-50 px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs font-semibold text-charcoal-700">
                <ShieldCheck className="h-4 w-4" /> {t('admin.farmerPayouts', language)}
              </span>
              <span className="text-base font-bold text-charcoal-800">{formatCurrency(242000)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-charcoal-50 px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs font-semibold text-charcoal-700">
                <Star className="h-4 w-4" /> {t('admin.avgRating', language)}
              </span>
              <span className="text-base font-bold text-charcoal-800">4.6</span>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal-800">{t('admin.verificationQueue', language)}</h2>
              <Link href="/admin/users" className="text-xs font-medium text-primary-700 hover:underline">
                {t('common.viewAll', language)}
              </Link>
            </div>
            <VerificationQueue items={MOCK_PENDING_USERS} />
          </Card>

          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('admin.recentOrders', language)}</h2>
              <div className="space-y-2">
                {[['VAX26090042', '₹846', 'success'], ['VAX26090039', '₹1,220', 'info'], ['VAX26090031', '₹543', 'warning']].map(
                  ([number, amount, variant]) => (
                    <div key={number} className="flex items-center justify-between rounded-lg bg-charcoal-50 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', variant === 'success' ? 'bg-green-500' : variant === 'info' ? 'bg-primary-500' : 'bg-accent-500')} />
                        <span className="text-xs font-semibold text-charcoal-700">{number}</span>
                      </div>
                      <span className="text-xs font-bold text-charcoal-800">{amount}</span>
                    </div>
                  )
                )}
              </div>
            </Card>
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('admin.riskAlerts', language)}</h2>
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                  <AlertTriangle className="h-4 w-4" /> {t('admin.stockShortage', language)}
                </p>
                <p className="mt-1 text-xs text-red-600">{t('admin.stockShortageDesc', language)}</p>
              </div>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}