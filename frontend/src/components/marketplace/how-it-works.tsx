'use client';

import { Search, BadgeIndianRupee, Truck, PackageCheck } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';

const STEPS = [
  { key: 'step1', icon: Search },
  { key: 'step2', icon: BadgeIndianRupee },
  { key: 'step3', icon: Truck },
  { key: 'step4', icon: PackageCheck },
];

export function HowItWorks() {
  const language = useUIStore((state) => state.language);

  return (
    <section className="bg-white py-12" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 text-center">
          <h2 id="how-it-works-heading" className="text-2xl font-bold text-charcoal-800 sm:text-3xl">
            {t('howItWorks.title', language)}
          </h2>
          <p className="mt-2 text-sm text-charcoal-500 sm:text-base">{t('howItWorks.subtitle', language)}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ key, icon: Icon }, index) => (
            <div
              key={key}
              className="relative rounded-2xl border border-charcoal-100 bg-charcoal-50/40 p-6 text-center transition-all hover:-translate-y-1 hover:border-primary-200 hover:bg-primary-50/50 hover:shadow"
            >
              {index < 3 && (
                <div className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 lg:block" aria-hidden="true">
                  <ArrowConnector />
                </div>
              )}
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm">
                <Icon className="h-6 w-6" />
              </div>
              <span className="mt-4 inline-block rounded-full bg-secondary-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-700">
                {index + 1}
              </span>
              <h3 className="mt-2 text-base font-semibold text-charcoal-800">{t(`howItWorks.${key}Title`, language)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{t(`howItWorks.${key}Desc`, language)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArrowConnector() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary-300" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 12h14m0 0l-6-6m6 6l-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}