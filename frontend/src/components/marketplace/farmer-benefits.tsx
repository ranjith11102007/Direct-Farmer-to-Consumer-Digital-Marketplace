'use client';

import Link from 'next/link';
import { ArrowRight, Users, BadgeIndianRupee, BrainCircuit, Truck, Wallet } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';

const BENEFITS = [
  { key: 'directBuyers', icon: Users, accent: 'from-primary-500 to-emerald-700' },
  { key: 'betterPrices', icon: BadgeIndianRupee, accent: 'from-secondary-400 to-secondary-600' },
  { key: 'aiForecasts', icon: BrainCircuit, accent: 'from-violet-500 to-violet-700' },
  { key: 'logistics', icon: Truck, accent: 'from-accent-500 to-accent-700' },
  { key: 'transparentSettlements', icon: Wallet, accent: 'from-sky-500 to-blue-700' },
];

export function FarmerBenefits() {
  const language = useUIStore((state) => state.language);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-emerald-950 py-14">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 42px)',
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t('farmerBenefits.title', language)}</h2>
          <p className="mt-2 text-sm text-primary-200 sm:text-base">{t('farmerBenefits.subtitle', language)}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ key, icon: Icon, accent }) => (
            <div
              key={key}
              className="rounded-2xl border border-primary-700/30 bg-primary-800/40 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-primary-800/60"
            >
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-white`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{t(`farmerBenefits.${key}`, language)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-primary-200">{t(`farmerBenefits.${key}Desc`, language)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/register?role=farmer"
            className="group inline-flex items-center gap-2 rounded-full bg-secondary-100 px-6 py-3 text-sm font-bold text-primary-800 transition-all hover:bg-white hover:shadow-md"
          >
            {t('farmerBenefits.joinAsFarmer', language)}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}