'use client';

import { UserCheck, BadgeIndianRupee, ScanLine, ShieldCheck, BrainCircuit, Truck, type LucideIcon } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';

const INDICATORS: Array<{ key: string; icon: LucideIcon; accent: string }> = [
  { key: 'verifiedProducers', icon: UserCheck, accent: 'from-primary-500 to-primary-700' },
  { key: 'transparentPricing', icon: BadgeIndianRupee, accent: 'from-secondary-400 to-secondary-600' },
  { key: 'traceableBatches', icon: ScanLine, accent: 'from-sky-500 to-sky-700' },
  { key: 'securePayments', icon: ShieldCheck, accent: 'from-emerald-500 to-emerald-700' },
  { key: 'aiPowered', icon: BrainCircuit, accent: 'from-violet-500 to-violet-700' },
  { key: 'farmToHome', icon: Truck, accent: 'from-accent-500 to-accent-700' },
];

export function TrustIndicators() {
  const language = useUIStore((state) => state.language);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8" aria-label="Trust indicators">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {INDICATORS.map(({ key, icon: Icon, accent }) => (
          <div
            key={key}
            className="flex flex-col items-center gap-2 rounded-xl border border-charcoal-100 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-white shadow-sm`}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-xs font-semibold text-charcoal-800">{t(`trust.${key}`, language)}</p>
            <p className="text-[11px] leading-snug text-charcoal-500">{t(`trust.${key}Desc`, language)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}