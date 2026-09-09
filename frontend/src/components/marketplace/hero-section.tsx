'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, ArrowRight, Leaf } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { LocationSelector } from '@/components/layout/location-selector';
import { SearchInput } from '@/components/ui/search-input';

export function HeroSection() {
  const language = useUIStore((state) => state.language);
  const [locationOpen, setLocationOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.3) 0%, transparent 35%)',
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-500/40 bg-primary-700/40 px-4 py-1.5 text-xs font-medium text-secondary-100 backdrop-blur">
            <Leaf className="h-3.5 w-3.5 text-secondary-300" />
            {t('hero.todayFresh', language)}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t('hero.title', language)}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-primary-100 sm:text-lg">
            {t('hero.subtitle', language)}
          </p>

          <div className="mx-auto mt-8 max-w-xl">
            <SearchInput
              placeholder={t('hero.searchPlaceholder', language)}
              suggestions={['Tomato', 'Banana', 'Millets', 'Organic', 'Spices']}
              className="rounded-2xl shadow-lg shadow-primary-900/30"
            />
          </div>

          <div className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-3">
            <Link
              href="/marketplace"
              className="group inline-flex items-center gap-2 rounded-full bg-secondary-100 px-6 py-3 text-sm font-bold text-primary-800 shadow-sm transition-all hover:bg-white hover:shadow-md"
            >
              {t('hero.ctaShop', language)}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/producer/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-primary-500/60 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-primary-300 hover:bg-primary-700/40"
            >
              {t('hero.ctaSell', language)}
            </Link>
            <button
              onClick={() => setLocationOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-200 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              <MapPin className="h-4 w-4" />
              {t('location.enterPincode', language)}
            </button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-primary-200/80">
            {[
              { label: '50K+', sub: t('hero.trustBadge', language) },
              { label: '500+', sub: t('trust.verifiedProducers', language) },
              { label: '24h', sub: t('products.deliveryBy', language) },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl font-bold text-white">{stat.label}</p>
                <p className="mt-0.5 max-w-28">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LocationSelector open={locationOpen} onClose={() => setLocationOpen(false)} />
    </section>
  );
}