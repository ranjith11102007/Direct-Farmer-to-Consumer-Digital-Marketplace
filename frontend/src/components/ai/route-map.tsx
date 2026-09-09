'use client';

import { MapPin, Navigation2, Truck, Home } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';

export interface RouteMapProps {
  origin?: { label: string; lat?: number; lng?: number };
  stops?: Array<{ label: string; lat?: number; lng?: number; status?: string }>;
  currentStop?: number;
  height?: number;
  loading?: boolean;
}

export function RouteMap({ origin, stops = [], currentStop = -1, height = 280, loading = false }: RouteMapProps) {
  const language = useUIStore((state) => state.language);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-charcoal-200 bg-gradient-to-br from-primary-50 via-white to-secondary-50"
      style={{ height }}
      role="img"
      aria-label={t('delivery.dashboard', language)}
    >
      <div className="absolute inset-0" aria-hidden="true">
        <GridPattern />
      </div>

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600" />
        </div>
      ) : (
        <>
          {origin && (
            <div className="absolute left-[15%] top-[15%] flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white shadow-md">
                <Home className="h-4 w-4" />
              </span>
              <span className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-charcoal-700 shadow-sm backdrop-blur">
                {origin.label}
              </span>
            </div>
          )}

          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            {stops.length > 0 && (
              <path
                d={buildPath(origin ? 1 : 0, stops.length)}
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                opacity="0.6"
              />
            )}
          </svg>

          <div className="absolute right-[12%] top-[30%] flex items-center gap-2">
            <Navigation2 className="h-5 w-5 rotate-45 text-accent-500" />
            <span className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-charcoal-500 shadow-sm backdrop-blur">
              {t('delivery.stopNavigation', language)}
            </span>
          </div>

          {stops.map((stop, index) => (
            <div
              key={`${stop.label}-${index}`}
              className={cn(
                'absolute flex items-center gap-1.5 transition-all',
                getStopPosition(index, stops.length)
              )}
            >
              {index === currentStop ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg ring-4 ring-accent-100">
                  <Truck className="h-4 w-4" />
                </span>
              ) : (
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-white shadow', stop.status === 'delivered' ? 'bg-green-500' : 'bg-primary-600')}>
                  <MapPin className="h-4 w-4" />
                </span>
              )}
              <span className="rounded-md bg-white/85 px-1.5 py-0.5 text-[10px] font-medium text-charcoal-700 shadow-sm backdrop-blur">
                {index + 1}. {stop.label}
              </span>
            </div>
          ))}

          {stops.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-charcoal-400">
              <Navigation2 className="h-8 w-8" />
              <p className="text-sm">{t('delivery.noRouteToday', language)}</p>
            </div>
          )}

          <div className="absolute bottom-3 left-3 rounded-lg bg-white/85 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur">
            <span className="font-medium text-charcoal-700">{origin?.label ?? 'Farm DC'}</span>
            <span className="text-charcoal-400"> → {stops.length} {t('delivery.stops', language)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function getStopPosition(index: number, total: number): string {
  const positions = [
    'left-[35%] top-[28%]',
    'left-[55%] top-[45%]',
    'left-[70%] top-[70%]',
    'left-[40%] top-[75%]',
    'left-[20%] top-[60%]',
    'left-[65%] top-[20%]',
  ];
  if (total === 1) return 'left-[45%] top-[50%]';
  return positions[Math.min(index, positions.length - 1)];
}

function buildPath(originStops: number, totalStops: number): string {
  const points = ['M 18% 18%'];
  const pathPoints = [
    ['L 38% 30%', 'L 58% 48%', 'L 73% 72%', 'L 42% 78%', 'L 22% 62%', 'L 68% 22%'],
  ];
  pathPoints[0].slice(originStops, originStops + Math.max(totalStops, 1)).forEach((point) => points.push(point));
  return points.join(' ');
}

function GridPattern() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden="true">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}