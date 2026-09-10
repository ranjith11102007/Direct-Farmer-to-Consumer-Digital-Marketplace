'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BrainCircuit,
  Wallet,
  ChevronRight,
  Plus,
  Sprout,
  Truck,
  ShieldCheck,
  Star,
  Bell,
  User,
} from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { RoleGuard } from '@/components/auth/role-guard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DemandChart } from '@/components/ai/demand-chart';
import { ForecastCard } from '@/components/ai/forecast-card';
import { useProducerProfile, useForecasts } from '@/hooks/useApi';
import { useUIStore, useAuthStore, useOrdersStore, useNotificationsStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/producer/dashboard', labelKey: 'producer.dashboard', icon: LayoutDashboard },
  { href: '/producer/products', labelKey: 'producer.products', icon: Package },
  { href: '/producer/orders', labelKey: 'producer.incomingOrders', icon: Bell },
  { href: '/producer/forecasts', labelKey: 'producer.forecasts', icon: BrainCircuit },
  { href: '/producer/settlements', labelKey: 'producer.settlements', icon: Wallet },
];

export default function ProducerDashboardPage() {
  const language = useUIStore((state) => state.language);
  const user = useAuthStore((state) => state.user);
  const { data: profile, isLoading } = useProducerProfile();
  const { data: forecasts } = useForecasts({ scope: 'producer', limit: 3 });

  const farmerOrders = useOrdersStore((s) => user ? s.getOrdersByFarmer(user.id) : []);
  const pendingOrders = farmerOrders.filter((o) => o.orderStatus === 'pending').length;

  const unreadCount = useNotificationsStore((s) => user ? s.getUnreadCount(user.id) : 0);

  return (
    <RoleGuard roles={['farmer', 'fpo', 'fpo_admin', 'admin']} redirectTo="/delivery/dashboard">
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-bold text-white">
              {profile ? profile.farmName.charAt(0) : user?.name?.[0] ?? 'F'}
            </span>
            <div>
              <h1 className="text-xl font-bold text-charcoal-800">
                {t('producer.welcome', language).replace('{{name}}', profile?.farmName ?? user?.name ?? '')}
              </h1>
              <p className="flex items-center gap-1 text-sm text-charcoal-500">
                {profile ? `${profile.village}, ${profile.district}` : ''}
                {profile && (
                  <span className="ml-1 flex items-center gap-0.5 text-primary-700">
                    <Star className="h-3.5 w-3.5 fill-current" /> {profile.averageRating.toFixed(1)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {pendingOrders > 0 && (
              <Badge variant="danger" icon={<Bell className="h-3 w-3" />}>
                {pendingOrders} new order{pendingOrders > 1 ? 's' : ''}
              </Badge>
            )}
            {unreadCount > 0 && (
              <Badge variant="warning" icon={<Bell className="h-3 w-3" />}>
                {unreadCount} notification{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
            {profile?.settlementsEnabled && (
              <Badge variant="success" icon={<ShieldCheck className="h-3 w-3" />}>
                {t('producer.settlementsEnabled', language)}
              </Badge>
            )}
            <Link href="/producer/products?new=1">
              <Button>
                <Plus className="h-4 w-4" /> {t('producer.addProduct', language)}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {NAV_ITEMS.map(({ href, labelKey, icon: Icon }, index) => (
            <Link key={href} href={href}>
              <Card
                hoverable
                className={cn(
                  'flex items-center justify-between py-4',
                  index === 0 && 'border-primary-300 bg-primary-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary-600" />
                  <span className="text-xs font-semibold text-charcoal-700">
                    {labelKey === 'producer.incomingOrders' ? t('producer.incomingOrders', language) : t(labelKey, language)}
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-charcoal-300" />
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsTile label={t('producer.activeListings', language)} value="12" icon={Package} accent="from-primary-500 to-primary-700" />
          <StatsTile label={t('producer.thisWeekSales', language)} value={formatCurrency(18450)} icon={ShoppingCart} accent="from-emerald-500 to-teal-700" />
          <StatsTile label={t('producer.outstandingPayout', language)} value={formatCurrency(6240)} icon={Wallet} accent="from-accent-500 to-orange-700" />
          <StatsTile label={t('producer.deliveriesInTransit', language)} value="3" icon={Truck} accent="from-violet-500 to-purple-700" footer={<Badge variant="success">{t('producer.onTime', language)}</Badge>} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal-800">{t('producer.demandForecast', language)}</h2>
              <Link href="/producer/forecasts" className="text-xs font-medium text-primary-700 hover:underline">
                {t('common.viewAll', language)}
              </Link>
            </div>
            <DemandChart forecasts={forecasts} height={280} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('producer.todayTasks', language)}</h2>
            <div className="space-y-2.5">
              {[{ icon: Sprout, key: 'taskHarvest' }, { icon: Truck, key: 'taskDispatch' }, { icon: Package, key: 'taskQuality' }].map(
                ({ icon: Icon, key }, index) => (
                  <div key={key} className="flex items-center gap-3 rounded-xl border border-charcoal-100 px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal-800">{t(`producer.${key}`, language)}</p>
                      <p className="text-[11px] text-charcoal-400">{t('producer.dueToday', language)}</p>
                    </div>
                    <Badge variant={index === 0 ? 'danger' : 'neutral'}>
                      {index === 0 ? t('producer.highPriority', language) : t('producer.optional', language)}
                    </Badge>
                  </div>
                )
              )}
            </div>

            <div className="mt-4 border-t border-charcoal-100 pt-4">
              <p className="mb-2 text-xs font-semibold text-charcoal-700">{t('producer.aiPulseTitle', language)}</p>
              <div className="rounded-xl bg-violet-50 p-3">
                <p className="text-xs leading-relaxed text-violet-900">
                  {t('producer.aiPulse', language)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal-800">{t('producer.topRecommendations', language)}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {forecasts?.slice(0, 3).map((forecast) => (
              <ForecastCard key={forecast.id} forecast={forecast} compact />
            ))}
            {!forecasts?.length && (
              <Card className="py-10 text-center text-sm text-charcoal-400">{t('producer.noForecasts', language)}</Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </RoleGuard>
  );
}

function StatsTile({
  label,
  value,
  icon: Icon,
  accent,
  footer,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{label}</p>
          <p className="mt-1 text-lg font-bold text-charcoal-800">{value}</p>
        </div>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-white', accent)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {footer && <div className="mt-2">{footer}</div>}
    </Card>
  );
}
