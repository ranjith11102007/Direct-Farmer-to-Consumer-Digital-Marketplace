'use client';

import { useState } from 'react';
import { TrendingUp, Users, ShoppingCart, Wallet, Calendar, Download, BarChart3 } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MetricsCard } from '@/components/admin/metrics-card';
import { DemandChart } from '@/components/ai/demand-chart';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency } from '@/lib/utils';

const MONTHLY = [
  { name: 'Apr', revenue: 980000 },
  { name: 'May', revenue: 1210000 },
  { name: 'Jun', revenue: 1100000 },
  { name: 'Jul', revenue: 1420000 },
  { name: 'Aug', revenue: 1680000 },
  { name: 'Sep', revenue: 1894000 },
];

const TOP_CATEGORIES = [
  { name: 'vegetables', value: 42, color: 'bg-primary-500' },
  { name: 'fruits', value: 24, color: 'bg-accent-500' },
  { name: 'grains', value: 16, color: 'bg-amber-500' },
  { name: 'dairy', value: 12, color: 'bg-sky-500' },
  { name: 'others', value: 6, color: 'bg-charcoal-300' },
];

const CHANNELS = [
  { name: 'Web', value: 54, color: 'bg-primary-600' },
  { name: 'Android', value: 28, color: 'bg-emerald-600' },
  { name: 'iOS', value: 15, color: 'bg-accent-500' },
  { name: 'WhatsApp', value: 3, color: 'bg-charcoal-400' },
];

export default function AdminAnalyticsPage() {
  const language = useUIStore((state) => state.language);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  const maxRevenue = Math.max(...MONTHLY.map((m) => m.revenue));

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-charcoal-800">
              <BarChart3 className="h-5 w-5 text-primary-600" /> {t('admin.analytics', language)}
            </h1>
            <p className="mt-1 text-sm text-charcoal-500">{t('admin.analyticsSubtitle', language)}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-charcoal-100 p-1">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    range === r ? 'bg-white text-primary-700 shadow-sm' : 'text-charcoal-500'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <select className="rounded-lg border border-charcoal-200 px-3 py-1.5 text-xs focus:border-primary-500 focus:outline-none">
              {['Tambaram', 'Chennai', 'Madurai', 'Coimbatore'].map((z) => <option key={z}>{z}</option>)}
            </select>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" /> {t('admin.exportReport', language)}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricsCard label={t('admin.revenue', language)} value={formatCurrency(1894000)} icon={TrendingUp} trend={15.1} trendLabel={t('admin.moM', language)} />
          <MetricsCard label={t('admin.newCustomers', language)} value="1,846" icon={Users} trend={9.4} trendLabel={t('admin.moM', language)} accent="from-accent-500 to-orange-700" />
          <MetricsCard label={t('admin.orderCount', language)} value="26,310" icon={ShoppingCart} trend={12.8} trendLabel={t('admin.moM', language)} accent="from-emerald-600 to-teal-700" />
          <MetricsCard label={t('admin.farmerPayouts', language)} value={formatCurrency(1224800)} icon={Wallet} trend={14.2} trendLabel={t('admin.moM', language)} accent="from-violet-500 to-purple-700" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-charcoal-800">
                <Calendar className="h-4 w-4 text-primary-600" /> {t('admin.revenueTrend', language)}
              </h2>
              <Badge variant="info">{range}</Badge>
            </div>
            <div className="space-y-3">
              {MONTHLY.map((m) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="w-8 text-xs font-medium text-charcoal-500">{m.name}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-full bg-charcoal-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-700"
                      style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs font-semibold text-charcoal-700">{formatCurrency(m.revenue)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-charcoal-100 pt-4">
              <DemandChart height={200} />
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('admin.categoryShare', language)}</h2>
              <div className="space-y-2.5">
                {TOP_CATEGORIES.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-20 truncate text-xs text-charcoal-600">{t(`categories.${name}`, language) === `categories.${name}` ? name : t(`categories.${name}`, language)}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-charcoal-100">
                      <div className={cn('h-full rounded-full', color)} style={{ width: `${value}%` }} />
                    </div>
                    <span className="w-9 text-right text-xs font-semibold text-charcoal-600">{value}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('admin.channels', language)}</h2>
              <div className="space-y-2.5">
                {CHANNELS.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-20 truncate text-xs text-charcoal-600">{name}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-charcoal-100">
                      <div className={cn('h-full rounded-full', color)} style={{ width: `${value}%` }} />
                    </div>
                    <span className="w-9 text-right text-xs font-semibold text-charcoal-600">{value}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-secondary-50 border-secondary-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary-700">{t('admin.insight', language)}</p>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-700">
                {t('admin.insightText', language)}
              </p>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}