'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  CalendarDays,
  ChevronRight,
  Repeat,
  Package,
  Inbox,
} from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { CategoryNav } from '@/components/layout/category-nav';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { QuotationCard } from '@/components/bulk/quotation-card';
import { useBulkRequirements } from '@/hooks/useApi';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { BulkRequirement, Quotation } from '@/types';

const QUOTATION_STATUS_VARIANT: Record<string, 'success' | 'info' | 'neutral' | 'danger' | 'warning'> = {
  open: 'warning',
  quoted: 'info',
  awarded: 'success',
  fulfilled: 'success',
  cancelled: 'danger',
};

const MOCK_QUOTATIONS: Quotation[] = [
  {
    id: 'q1',
    requirementId: 'r1',
    supplierId: 'f1',
    supplierType: 'fpo',
    supplierName: 'DL Garden Fresh FPO',
    pricePerUnit: 38,
    totalQuote: 22800,
    availableQuantity: 4500,
    expectedDeliveryDate: '2026-09-15T00:00:00.000Z',
    qualityCommitments: ['Pesticide-tested', 'Same-day harvest', 'Cold chain maintained'],
    avgRating: 4.6,
    notes: 'Can supply organic-grade tomatoes; delivery in chilled reefer.',
    status: 'submitted',
    submittedAt: '2026-09-08T08:00:00.000Z',
  },
  {
    id: 'q2',
    requirementId: 'r1',
    supplierId: 'f2',
    supplierType: 'farmer',
    supplierName: 'Murugan Mandi Cooperative',
    pricePerUnit: 42,
    totalQuote: 25200,
    availableQuantity: 600,
    expectedDeliveryDate: '2026-09-17T00:00:00.000Z',
    qualityCommitments: ['A-grade', 'Contract farming'],
    avgRating: 4.3,
    notes: '',
    status: 'accepted',
    submittedAt: '2026-09-08T11:00:00.000Z',
  },
];

export default function BulkRequirementsPage() {
  const language = useUIStore((state) => state.language);
  const [status, setStatus] = useState<'open' | 'quoted' | 'awarded' | 'all'>('all');

  const { data, isLoading } = useBulkRequirements();
  const requirements = (data ?? []).filter((req) =>
    status === 'all' ? true : req.status === status
  );

  return (
    <>
      <PromoStrip />
      <Header />
      <CategoryNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-charcoal-800">{t('bulk.openRequirements', language)}</h1>
            <p className="mt-1 text-sm text-charcoal-500">{t('bulk.openRequirementsSubtitle', language)}</p>
          </div>
          <Link href="/bulk">
            <Button>
              <Inbox className="h-4 w-4" /> {t('bulk.postRequirement', language)}
            </Button>
          </Link>
        </div>

        <Tabs
          variant="pill"
          activeKey={status}
          onChange={(key) => {
            setStatus(key as typeof status);
          }}
          tabs={[
            { key: 'all', label: t('orders.all', language) },
            { key: 'open', label: t('bulk.open', language) },
            { key: 'quoted', label: t('bulk.quoted', language) },
            { key: 'awarded', label: t('bulk.awarded', language) },
          ]}
        />

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {isLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="animate-pulse rounded-xl border border-charcoal-100 p-5">
                    <div className="h-4 w-2/3 rounded bg-charcoal-100" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-charcoal-100" />
                  </div>
                ))}
              </div>
            ) : requirements.length === 0 ? (
              <Card className="py-16 text-center">
                <Package className="mx-auto h-8 w-8 text-charcoal-300" />
                <p className="mt-3 text-sm text-charcoal-400">{t('bulk.noRequirements', language)}</p>
              </Card>
            ) : (
              requirements.map((req) => <RequirementRow key={req.id} requirement={req} />)
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold text-charcoal-800">{t('bulk.quotationsReceived', language)}</h2>
            {MOCK_QUOTATIONS.map((quotation) => (
              <QuotationCard key={quotation.id} quotation={quotation} />
            ))}
          </aside>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

function RequirementRow({ requirement }: { requirement: BulkRequirement }) {
  const language = useUIStore((state) => state.language);
  return (
    <Card hoverable className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <span className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            requirement.recurring ? 'bg-primary-100 text-primary-700' : 'bg-charcoal-100 text-charcoal-500'
          )}>
            {requirement.recurring ? <Repeat className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-bold text-charcoal-800">{requirement.productName}</p>
            <p className="text-xs text-charcoal-500">
              {t(`bulk.by`, language)} <b className="text-charcoal-700">{requirement.buyerName}</b>
              {requirement.buyerCompany && ` • ${requirement.buyerCompany}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-charcoal-600">
              <span className="rounded-full bg-charcoal-100 px-2 py-0.5">
                {requirement.quantity} {requirement.unit}
              </span>
              <span className="rounded-full bg-charcoal-100 px-2 py-0.5">
                {requirement.preferredGrade ?? t('bulk.anyGrade', language)}
              </span>
              {requirement.budgetPerUnit && (
                <span className="rounded-full bg-accent-100 px-2 py-0.5 text-accent-700">
                  {formatCurrency(requirement.budgetPerUnit)}/{requirement.unit}
                </span>
              )}
            </div>
          </div>
        </div>
        <Badge variant={QUOTATION_STATUS_VARIANT[requirement.status]}>
          {t(`bulk.${requirement.status}`, language) === `bulk.${requirement.status}` ? requirement.status : t(`bulk.${requirement.status}`, language)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-charcoal-100 bg-charcoal-50/50 px-5 py-3 text-xs text-charcoal-500">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-primary-600" />
          {requirement.deliveryLocation.city}, {requirement.deliveryLocation.state}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5 text-primary-600" />
          {t('bulk.deliverBy', language)}: {formatDate(requirement.deliveryDeadline)}
        </span>
        {requirement.recurring && requirement.frequency && (
          <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-primary-700">
            <Repeat className="h-3 w-3" /> {t(`bulk.${requirement.frequency}`, language)}
          </span>
        )}
        <span className="ml-auto text-charcoal-400">
          {requirement.quotationsCount ?? 0} {t('bulk.quotationsReceived', language)} <ChevronRight className="inline h-3 w-3" />
        </span>
      </div>
    </Card>
  );
}