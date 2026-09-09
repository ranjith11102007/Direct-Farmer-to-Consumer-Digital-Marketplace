'use client';

import { useState } from 'react';
import { BrainCircuit, TrendingUp, AlertTriangle, Sparkles, CalendarDays } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DemandChart } from '@/components/ai/demand-chart';
import { ForecastCard } from '@/components/ai/forecast-card';
import { FoodLossAlert } from '@/components/ai/food-loss-alert';
import { useForecasts } from '@/hooks/useApi';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency } from '@/lib/utils';
import type { Forecast } from '@/types';

export default function AdminForecastsPage() {
  const language = useUIStore((state) => state.language);
  const [term, setTerm] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const { data: forecasts } = useForecasts({ granularity: term, limit: 9 });

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-charcoal-800">
              <BrainCircuit className="h-5 w-5 text-violet-600" /> {t('admin.forecasts', language)}
            </h1>
            <p className="mt-1 text-sm text-charcoal-500">{t('admin.forecastsSubtitle', language)}</p>
          </div>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value as typeof term)}
            className="rounded-lg border border-charcoal-200 px-3 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
          >
            <option value="daily">{t('forecasts.daily', language)}</option>
            <option value="weekly">{t('forecasts.weekly', language)}</option>
            <option value="monthly">{t('forecasts.monthly', language)}</option>
          </select>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{t('admin.expectedGmv', language)}</p>
              <p className="text-lg font-bold text-charcoal-800">{formatCurrency(2240000)}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-orange-700 text-white">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{t('admin.supplyGaps', language)}</p>
              <p className="text-lg font-bold text-charcoal-800">6</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{t('admin.modelAccuracy', language)}</p>
              <p className="text-lg font-bold text-charcoal-800">94.2%</p>
            </div>
          </Card>
        </div>

        <Card className="mb-6 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-charcoal-800">
              <CalendarDays className="h-4 w-4 text-primary-600" /> {t('admin.tomorrowDemand', language)}
            </h2>
            <Badge variant="info">{t(`forecasts.${term}`, language)}</Badge>
          </div>
          <DemandChart forecasts={forecasts} height={300} />
        </Card>

        <div className="mb-3">
          <h2 className="text-sm font-semibold text-charcoal-800">{t('admin.allForecasts', language)}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(forecasts ?? mockForecasts()).slice(0, 9).map((forecast) => (
            <ForecastCard key={forecast.id} forecast={forecast} />
          ))}
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('forecasts.foodLossSection', language)}</h2>
          <FoodLossAlert
            productName="Organic Tomatoes"
            quantityLeavingValue={1820}
            estimatedLossKg={12.5}
            severity="high"
            reason="Expected temperature rise of 4°C + festival demand spike may leave stock unsold by Thursday."
          />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

function mockForecasts(): Forecast[] {
  const base: Forecast[] = [
    {
      id: 'f1',
      productId: 'p1',
      productName: 'Organic Tomatoes',
      category: 'vegetables',
      location: 'Thiruvannamalai',
      period: { from: '2026-09-10', to: '2026-09-17' },
      predictedDemandUnits: 1420,
      predictedPriceRange: { low: 38, high: 52 },
      confidenceScore: 0.84,
      confidence: 'high',
      factors: ['Festival demand', 'Monsoon dip'],
      weatherInfluence: 'Rain possible; supply may drop 12%',
      seasonality: ['Karthigai Deepam', 'Post-monsoon'],
      marketTrends: ['Wholesale price up 8%'],
      recommendedAction: 'Increase listings by 20% and start cold storage for 2 days.',
      advisoryNotes: 'Maintain quality checks; buyers prefer smaller households this week.',
      lastUpdated: '2026-09-09T02:00:00.000Z',
    },
    {
      id: 'f2',
      productId: 'p2',
      productName: 'Millets Mix',
      category: 'grains',
      location: 'Virudhunagar',
      period: { from: '2026-09-10', to: '2026-09-17' },
      predictedDemandUnits: 620,
      predictedPriceRange: { low: 82, high: 96 },
      confidenceScore: 0.78,
      confidence: 'medium',
      factors: ['Health trend'],
      recommendedAction: 'Bundle 500g packs with jaggery for festive combos.',
      seasonality: ['Bulk buyers active'],
      advisoryNotes: '',
      lastUpdated: '2026-09-09T02:00:00.000Z',
    },
  ];
  const extra: Forecast[] = Array.from({ length: 7 }).map((_, index) => ({
    ...base[index % 2],
    id: `f-extra-${index}`,
    productName: ['Carrots', 'Spinach', 'Coconut', 'Curd', 'Banana', 'Toor Dal', 'Jaggery'][index],
    category: index % 2 === 0 ? 'vegetables' : (['grains', 'pulses', 'dairy', 'fruits'][index % 3] as Forecast['category']),
    predictedDemandUnits: 400 + index * 170,
    predictedPriceRange: { low: 30 + index * 4, high: 48 + index * 6 },
  }));
  return [...base, ...extra];
}