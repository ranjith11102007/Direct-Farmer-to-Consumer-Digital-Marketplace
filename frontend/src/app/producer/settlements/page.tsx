'use client';

import { useState } from 'react';
import { Wallet, Download, Eye, TrendingUp, Receipt } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { PageLoader } from '@/components/ui/loading';
import { SettlementCard } from '@/components/producer/settlement-card';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Settlement, SettlementStatus } from '@/types';

const MOCK_SETTLEMENTS: Settlement[] = [
  {
    id: 's1',
    settlementNumber: 'VAX-2026-0042',
    recipientType: 'farmer',
    fromDate: '2026-08-24T00:00:00.000Z',
    toDate: '2026-08-30T23:59:59.000Z',
    totalSales: 12480,
    commission: 624,
    logisticsCost: 240,
    packagingCost: 180,
    netAmount: 11436,
    ordersCount: 23,
    status: 'pending',
    settlementType: 'weekly',
    bankAccount: { accountNumberMasked: '**** **** 4821', ifsc: 'SBIN0001234', bankName: 'SBI' },
    createdBy: 'auto',
    lineItems: [],
    createdAt: '2026-08-31T06:00:00.000Z',
  },
  {
    id: 's2',
    settlementNumber: 'VAX-2026-0031',
    recipientType: 'farmer',
    fromDate: '2026-08-17T00:00:00.000Z',
    toDate: '2026-08-23T23:59:59.000Z',
    totalSales: 10890,
    commission: 545,
    logisticsCost: 210,
    packagingCost: 150,
    netAmount: 9985,
    ordersCount: 19,
    status: 'processing',
    settlementType: 'weekly',
    bankAccount: { accountNumberMasked: '**** **** 4821', ifsc: 'SBIN0001234', bankName: 'SBI' },
    createdBy: 'auto',
    lineItems: [],
    createdAt: '2026-08-24T06:00:00.000Z',
  },
  {
    id: 's3',
    settlementNumber: 'VAX-2026-0020',
    recipientType: 'farmer',
    fromDate: '2026-08-10T00:00:00.000Z',
    toDate: '2026-08-16T23:59:59.000Z',
    totalSales: 9540,
    commission: 477,
    logisticsCost: 180,
    packagingCost: 120,
    netAmount: 8763,
    ordersCount: 17,
    status: 'completed',
    settlementType: 'weekly',
    bankAccount: { accountNumberMasked: '**** **** 4821', ifsc: 'SBIN0001234', bankName: 'SBI' },
    processedAt: '2026-08-18T09:30:00.000Z',
    invoiceUrl: '/mock/invoice-0020.pdf',
    createdBy: 'auto',
    lineItems: [],
    createdAt: '2026-08-17T06:00:00.000Z',
  },
];

const FILTERS: Array<{ key: SettlementStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
];

export default function ProducerSettlementsPage() {
  const language = useUIStore((state) => state.language);
  const [filter, setFilter] = useState<SettlementStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Settlement | null>(null);

  const settlements = MOCK_SETTLEMENTS.filter((s) => filter === 'all' || s.status === filter);

  const totalNet = MOCK_SETTLEMENTS.reduce((sum, s) => sum + s.netAmount, 0);

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-charcoal-800">{t('producer.settlements', language)}</h1>
          <p className="mt-1 text-sm text-charcoal-500">{t('producer.settlementsSubtitle', language)}</p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{t('settlements.totalNet', language)}</p>
              <p className="text-lg font-bold text-charcoal-800">{formatCurrency(totalNet)}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-orange-700 text-white">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{t('settlements.avgPerWeek', language)}</p>
              <p className="text-lg font-bold text-charcoal-800">{formatCurrency(Math.round(totalNet / 3))}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white">
              <Receipt className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{t('settlements.commissionPaid', language)}</p>
              <p className="text-lg font-bold text-charcoal-800">{formatCurrency(1646)}</p>
            </div>
          </Card>
        </div>

        <div className="mb-4 flex flex-wrap gap-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                filter === key ? 'bg-primary-600 text-white' : 'bg-charcoal-100 text-charcoal-600 hover:bg-charcoal-200'
              )}
            >
              {t(`settlements.${key === 'all' ? 'all' : key}`, language)}
            </button>
          ))}
        </div>

        {settlements.length === 0 ? (
          <PageLoader />
        ) : (
          <div className="space-y-3">
            {settlements.map((settlement) => (
              <SettlementCard
                key={settlement.id}
                settlement={settlement}
                onViewDetails={setSelected}
                onDownload={() => {}}
              />
            ))}
          </div>
        )}

        {settlements.length > 5 && (
          <div className="mt-5">
            <Pagination page={page} totalPages={2} onPageChange={setPage} />
          </div>
        )}
      </main>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`${t('settlements.viewDetails', language)} • ${selected?.settlementNumber ?? ''}`}
        subtitle={selected ? `${formatDate(selected.fromDate)} → ${formatDate(selected.toDate)}` : ''}
      >
        {selected && (
          <div className="space-y-2 text-sm">
            <Row label={t('settlements.totalSales', language)} value={formatCurrency(selected.totalSales)} />
            <Row label={t('settlements.ordersCount', language)} value={String(selected.ordersCount)} />
            <Row label={t('settlements.commission', language)} value={`−${formatCurrency(selected.commission)}`} danger />
            <Row label={t('settlements.logistics', language)} value={`−${formatCurrency(selected.logisticsCost)}`} danger />
            <Row label={t('settlements.packaging', language)} value={`−${formatCurrency(selected.packagingCost)}`} danger />
            <div className="border-t border-charcoal-100 pt-2">
              <Row label={t('settlements.netAmount', language)} value={formatCurrency(selected.netAmount)} bold />
            </div>
            <p className="pt-1 text-xs text-charcoal-400">
              {t('settlements.paymentTo', language)}: {selected.bankAccount.bankName} • {selected.bankAccount.accountNumberMasked}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                <Download className="h-3.5 w-3.5" /> {t('orders.exportInvoice', language)}
              </Button>
              <Button size="sm" onClick={() => setSelected(null)}>
                <Eye className="h-3.5 w-3.5" /> {t('settlements.viewStatement', language)}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Footer />
      <MobileNav />
    </>
  );
}

function Row({ label, value, danger = false, bold = false }: { label: string; value: string; danger?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-charcoal-500">{label}</span>
      <span className={cn('font-semibold', danger ? 'text-red-500' : bold ? 'text-primary-700' : 'text-charcoal-800')}>
        {value}
      </span>
    </div>
  );
}