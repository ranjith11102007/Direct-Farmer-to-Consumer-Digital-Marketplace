'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { Rating } from '@/components/ui/rating';
import type { Quotation } from '@/types';

export interface QuotationCardProps {
  quotation: Quotation;
  onAccept?: (quotation: Quotation) => void;
  onShortlist?: (quotation: Quotation) => void;
  onReject?: (quotation: Quotation) => void;
  selected?: boolean;
}

export function QuotationCard({ quotation, onAccept, onShortlist, onReject, selected = false }: QuotationCardProps) {
  const language = useUIStore((state) => state.language);

  return (
    <article
      className={cn(
        'rounded-xl border bg-white p-5 shadow-sm transition-all',
        selected ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-charcoal-200/70 hover:shadow-md'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
            {quotation.supplierName[0]}
          </span>
          <div>
            <p className="text-sm font-semibold text-charcoal-800">{quotation.supplierName}</p>
            <p className="text-xs text-charcoal-500">
              {quotation.supplierType === 'fpo' ? t('products.filters.fpo', language) : t('products.filters.individual', language)}
            </p>
          </div>
        </div>
        <Badge variant={quotation.status === 'accepted' ? 'success' : quotation.status === 'submitted' ? 'info' : 'neutral'}>
          {t(`status.${quotation.status === 'submitted' ? 'open' : quotation.status === 'accepted' ? 'verified' : 'rejected'}`, language)}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t('bulk.by', language)} value={formatCurrency(quotation.pricePerUnit)} suffix={`/${quotation.supplierType === 'fpo' ? 'kg' : 'kg'}`} />
        <Stat label="Total" value={formatCurrency(quotation.totalQuote)} />
        <Stat label={t('bulk.expectedDelivery', language)} value={formatDate(quotation.expectedDeliveryDate)} />
        <Stat label={t('bulk.supplierRating', language)} value={quotation.avgRating.toFixed(1)} />
      </div>

      <div className="mt-3">
        <Rating rating={quotation.avgRating} count={1} size="sm" />
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium text-charcoal-500">{t('bulk.qualityCommitments', language)}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {quotation.qualityCommitments?.map((commitment) => (
            <span key={commitment} className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700">
              {commitment}
            </span>
          ))}
        </div>
      </div>

      {quotation.notes && (
        <p className="mt-3 rounded-lg bg-charcoal-50 px-3 py-2 text-xs text-charcoal-600">{quotation.notes}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-charcoal-100 pt-4">
        {onAccept && (
          <Button size="sm" onClick={() => onAccept(quotation)}>
            {t('bulk.acceptQuotation', language)}
          </Button>
        )}
        {onShortlist && (
          <Button size="sm" variant="outline" onClick={() => onShortlist(quotation)}>
            {t('bulk.shortlistQuotation', language)}
          </Button>
        )}
        {onReject && (
          <Button size="sm" variant="ghost" onClick={() => onReject(quotation)}>
            {t('bulk.rejectQuotation', language)}
          </Button>
        )}
      </div>
    </article>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-lg bg-charcoal-50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-charcoal-800">
        {value}
        {suffix && <span className="text-xs font-normal text-charcoal-400">{suffix}</span>}
      </p>
    </div>
  );
}