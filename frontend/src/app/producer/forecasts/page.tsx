'use client';

import { useState } from 'react';
import { BrainCircuit, CalendarDays, RefreshCw, TrendingUp, Sparkles } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/loading';
import { DemandChart } from '@/components/ai/demand-chart';
import { ForecastCard } from '@/components/ai/forecast-card';
import { FoodLossAlert } from '@/components/ai/food-loss-alert';
import { useForecasts } from '@/hooks/useApi';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export default function ProducerForecastsPage() {
  const language = useUIStore((state) => state.language);
  const [view, setView] = useState<'card' | 'chart'>('card');
  const [term, setTerm] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const { data: forecasts, isLoading, refetch, isFetching } = useForecasts({ scope: 'producer', granularity: term, limit: 9 });

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-charcoal-800">
              <BrainCircuit className="h-5 w-5 text-violet-600" /> {t('producer.forecasts', language)}
            </h1>
            <p className="mt-1 text-sm text-charcoal-500">{t('producer.forecastsSubtitle', language)}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value as typeof term)}
              className="rounded-lg border border-charcoal-200 px-3 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
            >
              <option value="daily">{t('forecasts.daily', language)}</option>
              <option value="weekly">{t('forecasts.weekly', language)}</option>
              <option value="monthly">{t('forecasts.monthly', language)}</option>
            </select>
            <div className="flex rounded-lg bg-charcoal-100 p-1">
              {(['card', 'chart'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    view === v ? 'bg-white text-primary-700 shadow-sm' : 'text-charcoal-500'
                  )}
                >
                  {v === 'card' ? t('forecasts.cards', language) : t('forecasts.charts', language)}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
              <RefreshCw className="h-3.5 w-3.5" /> {t('common.refresh', language)}
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <SummaryTile
            label={t('forecasts.avgDemand', language)}
            value="1,240"
            unit={t('forecasts.demandUnits', language)}
            icon={TrendingUp}
            tone="primary"
          />
          <SummaryTile
            label={t('forecasts.priceRange', language)}
            value={`${formatCurrency(38)} – ${formatCurrency(56)}`}
            unit="avg/kg"
            icon={CalendarDays}
            tone="secondary"
          />
          <SummaryTile
            label={t('forecasts.confidence', language)}
            value="86%"
            unit={t('forecasts.highConfidence', language)}
            icon={Sparkles}
            tone="violet"
          />
        </div>

        {view === 'chart' ? (
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal-800">{t('forecasts.demandTrend', language)}</h2>
              <Badge variant="info">{t(`forecasts.${term}`, language)}</Badge>
            </div>
            <DemandChart forecasts={forecasts} height={320} />
          </Card>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal-800">{t('forecasts.cards', language)}</h2>
              <span className="text-xs text-charcoal-400">{t('forecasts.lastUpdated', language)}: {formatDate(new Date().toISOString())}</span>
            </div>

            {isLoading ? (
              <PageLoader />
            ) : forecasts?.length === 0 ? (
              <Card className="py-16 text-center">
                <p className="text-sm text-charcoal-400">{t('forecasts.empty', language)}</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {forecasts?.map((forecast) => (
                  <ForecastCard key={forecast.id} forecast={forecast} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('forecasts.foodLossSection', language)}</h2>
          <FoodLossAlert
            productName="Leafy Greens"
            quantityLeavingValue={420}
            estimatedLossKg={8.2}
            severity="medium"
            reason="Current inventory exceeds forecasted demand for the next 2 days; cold storage is recommended."
          />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

function SummaryTile({
  label,
  value,
  unit,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'primary' | 'secondary' | 'violet';
}) {
  const toneClasses = {
    primary: 'from-primary-500 to-primary-700',
    secondary: 'from-accent-500 to-orange-700',
    violet: 'from-violet-500 to-purple-700',
  };
  return (
    <Card className="flex items-center gap-3 py-4">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white', toneClasses[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{label}</p>
        <p className="text-lg font-bold text-charcoal-800">{value}</p>
        <p className="text-[11px] text-charcoal-400">{unit}</p>
      </div>
    </Card>
  );
}