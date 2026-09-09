'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBasket,
  Building2,
  TrendingDown,
  ShieldCheck,
  ArrowRight,
  ClipboardList,
  Award,
} from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RequirementForm } from '@/components/bulk/requirement-form';
import { useCreateBulkRequirement } from '@/hooks/useApi';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/utils';

export default function BulkPage() {
  const router = useRouter();
  const language = useUIStore((state) => state.language);
  const createRequirement = useCreateBulkRequirement();

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-10 text-center text-white sm:px-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <ShoppingBasket className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{t('bulk.title', language)}</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/85">{t('bulk.subtitle', language)}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/bulk/requirements">
<Button size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
                <ClipboardList className="h-4 w-4" /> {t('bulk.viewOpenRequirements', language)}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Perk icon={TrendingDown} label={t('bulk.perkPrice', language)} desc={t('bulk.perkPriceDesc', language)} />
          <Perk icon={Award} label={t('bulk.perkQuality', language)} desc={t('bulk.perkQualityDesc', language)} />
          <Perk icon={ShieldCheck} label={t('bulk.perkSourcing', language)} desc={t('bulk.perkSourcingDesc', language)} />
          <Perk icon={Building2} label={t('bulk.perkContract', language)} desc={t('bulk.perkContractDesc', language)} />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h2 className="mb-3 text-lg font-bold text-charcoal-800">{t('bulk.postRequirement', language)}</h2>
            <Suspense fallback={<div className="py-10 text-center text-sm text-charcoal-400">{t('common.loading', language)}</div>}>
              <RequirementForm
                onSubmit={async (data) => {
                  await createRequirement.mutateAsync(data);
                  router.push('/bulk/requirements');
                }}
              />
            </Suspense>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-lg font-bold text-charcoal-800">{t('bulk.howItWorks', language)}</h2>
            {[1, 2, 3, 4].map((step) => (
              <Card key={step} className="flex items-start gap-3 py-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-charcoal-800">{t(`bulk.step${step}`, language)}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-charcoal-500">{t(`bulk.step${step}Desc`, language)}</p>
                </div>
              </Card>
            ))}

            <Card className="bg-secondary-50">
              <Badge variant="success" icon={<ShieldCheck className="h-3 w-3" />}>
                {t('bulk.savingsBadge', language)}
              </Badge>
              <p className="mt-3 text-sm font-semibold text-charcoal-800">{t('bulk.savingsTitle', language)}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {[['22%', t('bulk.savingsCost')], ['3x', t('bulk.savingsSpeed')], ['0₹', t('bulk.savingsFee')]].map(([value, label]) => (
                  <div key={label} className="rounded-lg bg-white/70 px-2 py-3">
                    <p className="text-lg font-bold text-primary-700">{value}</p>
                    <p className="text-[10px] text-charcoal-500">{label}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex items-center justify-between rounded-xl border border-charcoal-200 px-4 py-3">
              <p className="text-sm font-medium text-charcoal-700">{t('bulk.viewOpenRequirements', language)}</p>
              <Link href="/bulk/requirements">
                <Button variant="outline" size="sm">
                  {t('common.viewAll', language)} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

function Perk({ icon: Icon, label, desc }: { icon: React.ComponentType<{ className?: string }>; label: string; desc: string }) {
  return (
    <Card className="py-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-bold text-charcoal-800">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-charcoal-500">{desc}</p>
    </Card>
  );
}