'use client';

import Link from 'next/link';
import { UtensilsCrossed, School, Building2, Factory, ArrowRight } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';

const SEGMENTS = [
  { key: 'hotelRest', icon: UtensilsCrossed },
  { key: 'institutions', icon: School },
  { key: 'housing', icon: Building2 },
  { key: 'manufacturers', icon: Factory },
];

const SEGMENT_ICON_TITLES: Record<string, string> = {
  hotelRest: 'hotelsRestaurants',
  institutions: 'institutions',
  housing: 'housingSocieties',
  manufacturers: 'manufacturers',
};

export function BulkBuyerSection() {
  const language = useUIStore((state) => state.language);

  return (
    <section className="bg-white py-12" aria-labelledby="bulk-heading">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 id="bulk-heading" className="text-2xl font-bold text-charcoal-800 sm:text-3xl">
              {t('bulkSection.title', language)}
            </h2>
            <p className="mt-2 text-sm text-charcoal-500 sm:text-base">{t('bulkSection.subtitle', language)}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {['qualityCommitments', 'quantityNote', 'recurring'].map((key) => (
                <span key={key} className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700">
                  {t(`bulk.${key}`, language)}
                </span>
              ))}
            </div>

            <p className="mt-6 text-sm font-semibold text-charcoal-700">{t('bulk.suppliers', language)}</p>

            <Link
              href="/bulk"
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              {t('bulkSection.startBulk', language)}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-3">
            {SEGMENTS.map(({ key, icon: Icon }) => (
              <div key={key} className="rounded-2xl border border-charcoal-100 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-charcoal-800">{t(`bulkSection.${key}`, language)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-charcoal-500">{t(`bulkSection.${key}Desc`, language)}</p>
                <p className="mt-2 text-xs font-medium text-primary-600">
                  {t(`bulk.${SEGMENT_ICON_TITLES[key]}`, language)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}