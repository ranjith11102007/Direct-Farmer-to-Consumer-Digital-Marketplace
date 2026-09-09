'use client';

import Link from 'next/link';
import { BrainCircuit, Route, Sparkles, BadgeIndianRupee, TrendingUp } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';

const FEATURES = [
  { key: 'demandForecast', icon: TrendingUp, accent: 'from-violet-500 to-purple-700' },
  { key: 'route', icon: Route, accent: 'from-accent-500 to-orange-700' },
  { key: 'resonance', icon: Sparkles, accent: 'from-sky-500 to-blue-700' },
  { key: 'price', icon: BadgeIndianRupee, accent: 'from-emerald-500 to-green-700' },
];

export function AIInsights() {
  const language = useUIStore((state) => state.language);

  return (
    <section className="bg-white py-12" aria-labelledby="ai-heading">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="relative rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-violet-50 p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-sm">
                  <BrainCircuit className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-violet-600">Vaikkal AI</p>
                  <p className="text-sm font-semibold text-charcoal-800">{t('aiInsights.resonanceDesc', language)}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <AIChartPlaceholder />
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <h2 id="ai-heading" className="text-2xl font-bold text-charcoal-800 sm:text-3xl">
              {t('aiInsights.title', language)}
            </h2>
            <p className="mt-2 text-sm text-charcoal-500 sm:text-base">{t('aiInsights.subtitle', language)}</p>

            <div className="mt-6 space-y-3">
              {FEATURES.map(({ key, icon: Icon, accent }) => (
                <div key={key} className="flex items-start gap-3 rounded-xl border border-charcoal-100 p-4 transition-all hover:border-primary-200 hover:bg-primary-50/40">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white', accent)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal-800">{t(`aiInsights.${key}Title`, language)}</h3>
                    <p className="mt-0.5 text-sm text-charcoal-500">{t(`aiInsights.${key}Desc`, language)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/producer/forecasts"
              className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline"
            >
              {t('aiInsights.learnMore', language)}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function AIChartPlaceholder() {
  return (
    <div className="rounded-xl border border-charcoal-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-charcoal-700">Tomato • {new Date().getFullYear()}</p>
          <p className="mt-0.5 text-[10px] text-charcoal-400">Tamil Nadu • {t('forecasts.confidence', 'en')}: 87%</p>
        </div>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
          {t('forecasts.demandUnits', 'en')}
        </span>
      </div>
      <div className="mt-3 flex h-20 items-end gap-1.5">
        {[40, 55, 46, 66, 52, 74, 61, 83, 70, 91, 78, 95].map((height, index) => (
          <div key={index} className="flex-1 rounded-t bg-gradient-to-t from-primary-500 to-primary-300" style={{ height: `${height}%` }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-charcoal-400">
        <span>Apr</span>
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
        <span>Aug</span>
        <span>Sep</span>
      </div>
    </div>
  );
}