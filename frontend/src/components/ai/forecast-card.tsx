'use client';

import { BrainCircuit, CloudSun, Calendar, TrendingUp, Lightbulb, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, formatDate, truncateText } from '@/lib/utils';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import type { Forecast, ForecastConfidence } from '@/types';

export interface ForecastCardProps {
  forecast: Forecast;
  compact?: boolean;
}

const confidenceVariant: Record<ForecastConfidence, 'success' | 'warning' | 'danger'> = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
};

const confidenceKey: Record<ForecastConfidence, string> = {
  high: 'highConfidence',
  medium: 'mediumConfidence',
  low: 'lowConfidence',
};

export function ForecastCard({ forecast, compact = false }: ForecastCardProps) {
  const language = useUIStore((state) => state.language);

  return (
    <article className="rounded-xl border border-charcoal-200/70 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white">
            <BrainCircuit className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-charcoal-800">{forecast.productName}</p>
            <p className="text-xs text-charcoal-400">{forecast.category} • {forecast.location}</p>
          </div>
        </div>
        <Badge variant={confidenceVariant[forecast.confidence]}>
          {t(`forecasts.${confidenceKey[forecast.confidence]}`, language)}
          <span className="ml-1 font-bold">{Math.round(forecast.confidenceScore * 100)}%</span>
        </Badge>
      </div>

      {!compact && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-primary-50 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-primary-600">{t('forecasts.predictedDemand', language)}</p>
              <p className="mt-0.5 text-sm font-bold text-primary-800">
                {forecast.predictedDemandUnits} {t('forecasts.demandUnits', language)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary-100 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-secondary-600">{t('forecasts.priceRange', language)}</p>
              <p className="mt-0.5 text-sm font-bold text-secondary-800">
                {formatCurrency(forecast.predictedPriceRange.low)}–{formatCurrency(forecast.predictedPriceRange.high)}
              </p>
            </div>
            <div className="rounded-lg bg-charcoal-100 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">{t('forecasts.period', language)}</p>
              <p className="mt-0.5 text-sm font-bold text-charcoal-700">
                {formatDate(forecast.period.from)}
              </p>
              <p className="text-[10px] text-charcoal-500">→ {formatDate(forecast.period.to)}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <ForecastRow icon={CloudSun} label={t('forecasts.weatherFactor', language)} value={forecast.weatherInfluence} />
            <ForecastRow icon={Calendar} label={t('forecasts.seasonality', language)} value={forecast.seasonality?.join(', ')} />
            <ForecastRow icon={TrendingUp} label={t('forecasts.marketTrends', language)} value={forecast.marketTrends?.join(', ')} />
          </div>

          <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              <Lightbulb className="h-3.5 w-3.5" />
              {t('forecasts.recommendedAction', language)}
            </p>
            <p className="mt-1 text-sm font-medium text-violet-900">{forecast.recommendedAction}</p>
            {forecast.recommendedPlantingQuantity && (
              <p className="mt-1 text-xs text-violet-700">
                {t('forecasts.recommendedPlanting', language)}: {forecast.recommendedPlantingQuantity}
              </p>
            )}
          </div>

          {forecast.advisoryNotes && (
            <p className="mt-3 text-xs leading-relaxed text-charcoal-500 italic">
              {truncateText(forecast.advisoryNotes, compact ? 100 : 180)}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-charcoal-100 pt-3">
            <p className="flex items-center gap-1 text-[11px] text-charcoal-400">
              <RefreshCw className="h-3 w-3" />
              {t('forecasts.lastUpdated', language)}: {formatDate(forecast.lastUpdated)}
            </p>
            <div className="flex flex-wrap gap-1">
              {forecast.factors?.slice(0, 2).map((factor) => (
                <span key={factor} className="rounded-full bg-charcoal-100 px-2 py-0.5 text-[10px] text-charcoal-500">
                  {truncateText(factor, 20)}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {compact && (
        <p className="mt-2 text-xs text-charcoal-500">{truncateText(forecast.recommendedAction, 80)}</p>
      )}
    </article>
  );
}

function ForecastRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal-400" />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400">{label}</p>
        <p className="text-xs text-charcoal-700">{value}</p>
      </div>
    </div>
  );
}