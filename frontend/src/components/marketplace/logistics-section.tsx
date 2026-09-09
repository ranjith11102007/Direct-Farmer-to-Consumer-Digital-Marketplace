'use client';

import { Tractor, Snowflake, MapPin, Radar } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'firstMile', icon: Tractor, accent: 'from-amber-500 to-orange-600' },
  { key: 'coldChain', icon: Snowflake, accent: 'from-sky-500 to-blue-600' },
  { key: 'lastMile', icon: MapPin, accent: 'from-primary-500 to-emerald-600' },
  { key: 'tracking', icon: Radar, accent: 'from-violet-500 to-purple-600' },
];

export function LogisticsSection() {
  const language = useUIStore((state) => state.language);

  return (
    <section className="bg-gradient-to-b from-white to-charcoal-50/60 py-12" aria-labelledby="logistics-heading">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 text-center">
          <h2 id="logistics-heading" className="text-2xl font-bold text-charcoal-800 sm:text-3xl">
            {t('logisticsSection.title', language)}
          </h2>
          <p className="mt-2 text-sm text-charcoal-500 sm:text-base">{t('logisticsSection.subtitle', language)}</p>
        </div>

        <div className="relative">
          <div className="absolute left-0 right-0 top-1/2 hidden h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200 lg:block" aria-hidden="true" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ key, icon: Icon, accent }, index) => (
              <div key={key} className="relative rounded-2xl border border-charcoal-100 bg-white p-6 text-center shadow-sm lg:bg-transparent lg:shadow-none">
                <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md">
                  {accent && <div className={cn('absolute inset-0 -z-10 rounded-full bg-gradient-to-br opacity-0', accent)} />}
                  <Icon className="h-7 w-7" />
                </div>
                <span className="z-10 relative mx-auto mt-4 -mb-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-charcoal-800">{t(`logisticsSection.${key}`, language)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{t(`logisticsSection.${key}Desc`, language)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}