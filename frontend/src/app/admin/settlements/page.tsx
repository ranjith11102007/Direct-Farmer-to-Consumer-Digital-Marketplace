'use client';

import { useState } from 'react';
import { Wallet, Download, CheckCircle2, Clock, RefreshCw, Banknote } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Settlement } from '@/types';

const STATUS_VARIANT: Record<Settlement['status'], 'warning' | 'info' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

const MOCK_SETTLEMENTS: Array<Partial<Settlement> & { id: string; settlementNumber: string; recipient: string; entityType: 'farmer' | 'fpo'; period: string; amount: number; status: Settlement['status']; updatedAt: string }> = [
  { id: 's1', settlementNumber: 'VAX-STL-0042', recipient: 'Kasirajan Murugan', entityType: 'farmer', period: '2026-08-24 → 2026-08-30', amount: 11436, status: 'pending', updatedAt: '2026-08-31T06:00:00.000Z' },
  { id: 's2', settlementNumber: 'VAX-STL-0041', recipient: 'Annadurai Cooperative FPO', entityType: 'fpo', period: '2026-08-24 → 2026-08-30', amount: 82450, status: 'processing', updatedAt: '2026-08-31T06:05:00.000Z' },
  { id: 's3', settlementNumber: 'VAX-STL-0038', recipient: 'Vijaya Dairy Farmers', entityType: 'fpo', period: '2026-08-17 → 2026-08-23', amount: 61200, status: 'completed', updatedAt: '2026-08-24T09:30:00.000Z' },
  { id: 's4', settlementNumber: 'VAX-STL-0035', recipient: 'Murugan Mandi', entityType: 'farmer', period: '2026-08-17 → 2026-08-23', amount: 8763, status: 'failed', updatedAt: '2026-08-24T09:40:00.000Z' },
];

export default function AdminSettlementsPage() {
  const language = useUIStore((state) => state.language);
  const [filter, setFilter] = useState<Settlement['status'] | 'all'>('all');
  const [page, setPage] = useState(1);

  const settlements = MOCK_SETTLEMENTS.filter((s) => filter === 'all' || s.status === filter);
  const pendingTotal = MOCK_SETTLEMENTS.filter((s) => s.status === 'pending' || s.status === 'processing').reduce((sum, s) => sum + s.amount, 0);

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-xl font-bold text-charcoal-800">
            <Wallet className="h-5 w-5 text-primary-600" /> {t('admin.settlements', language)}
          </h1>
          <p className="mt-1 text-sm text-charcoal-500">{t('admin.settlementsSubtitle', language)}</p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-orange-700 text-white">
              <RefreshCw className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{t('admin.pendingPayouts', language)}</p>
              <p className="text-lg font-bold text-charcoal-800">{formatCurrency(pendingTotal)}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{t('admin.avgSettlementDays', language)}</p>
              <p className="text-lg font-bold text-charcoal-800">2.4 {t('admin.days', language)}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <Banknote className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-400">{t('admin.thisMonthPaid', language)}</p>
              <p className="text-lg font-bold text-charcoal-800">{formatCurrency(548620)}</p>
            </div>
          </Card>
        </div>

        <div className="mb-4 flex flex-wrap gap-1">
          {(['all', 'pending', 'processing', 'completed', 'failed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                filter === s ? 'bg-primary-600 text-white' : 'bg-charcoal-100 text-charcoal-600 hover:bg-charcoal-200'
              )}
            >
              {t(`settlements.${s === 'all' ? 'all' : s}`, language)}
            </button>
          ))}
        </div>

        <Card>
          <div className="divide-y divide-charcoal-100">
            {settlements.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <Wallet className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal-800">
                    {s.recipient}
                    <Badge variant={s.entityType === 'fpo' ? 'info' : 'neutral'} className="ml-2">{s.entityType.toUpperCase()}</Badge>
                  </p>
                  <p className="text-xs text-charcoal-500">{s.settlementNumber} • {s.period} • {formatDate(s.updatedAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-charcoal-800">{formatCurrency(s.amount)}</span>
                  <Badge variant={STATUS_VARIANT[s.status]}>
                    {t(`settlements.${s.status}`, language)}
                  </Badge>
                  {s.status === 'pending' && (
                    <Button size="sm" onClick={() => toastInfo()}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('admin.processPayout', language)}
                    </Button>
                  )}
                  {s.status === 'completed' && (
                    <Button size="sm" variant="outline" onClick={() => toastInfo()}>
                      <Download className="h-3.5 w-3.5" /> {t('orders.exportInvoice', language)}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-6 flex justify-center">
          <Pagination page={page} totalPages={2} onPageChange={setPage} />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

function toastInfo() {
  const { toast } = require('sonner') as typeof import('sonner');
  toast.info('Processing initiated');
}