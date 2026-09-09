'use client';

import { useState } from 'react';
import { Package, Search, Check, X, Eye, Leaf } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Product } from '@/types';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  archived: 'neutral',
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    categoryId: 'c1',
    category: 'vegetables',
    name: 'Organic Tomatoes',
    nameTa: 'ஆர்கானிக் தக்காளி',
    description: 'Sun-ripened organic tomatoes from Thiruvannamalai farms.',
    images: [],
    unit: 'kg',
    basePricePerUnit: 38,
    currentPricePerUnit: 42,
    minOrderQuantity: 0.5,
    availableQuantity: 240,
    farmerId: 'f1',
    producer: { id: 'f1', name: 'Kasirajan', entityType: 'farmer' },
    sourceLocation: { district: 'Thiruvannamalai', state: 'TN' },
    grade: 'Organic' as Product['grade'],
    packagingType: 'loose',
    harvestDate: '2026-09-08T00:00:00.000Z',
    shelfLifeDays: 5,
    deliveryEstimateMins: 90,
    isOrganic: true,
    isOrganicCertified: true,
    certifications: ['IND ORGANIC'],
    stockStatus: 'in_stock',
    status: 'pending',
    avgRating: 4.7,
    totalRatings: 128,
    tags: ['organic', 'fresh'],
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
  },
  {
    id: 'p2',
    categoryId: 'c2',
    category: 'grains',
    name: 'Millets Mix',
    nameTa: 'மிலேட்ஸ் கலவை',
    description: 'Grain mix of foxtail, finger and pearl millet.',
    images: [],
    unit: 'kg',
    basePricePerUnit: 85,
    currentPricePerUnit: 92,
    minOrderQuantity: 1,
    availableQuantity: 500,
    farmerId: 'f2',
    producer: { id: 'f2', name: 'Annadurai FPO', entityType: 'fpo' },
    sourceLocation: { district: 'Virudhunagar', state: 'TN' },
    grade: 'A' as Product['grade'],
    packagingType: 'bag1kg',
    harvestDate: '2026-08-20T00:00:00.000Z',
    shelfLifeDays: 180,
    deliveryEstimateMins: 120,
    isOrganic: false,
    isOrganicCertified: false,
    certifications: [],
    stockStatus: 'in_stock',
    status: 'approved',
    avgRating: 4.5,
    totalRatings: 67,
    tags: ['millets', 'cereals'],
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z',
  },
  {
    id: 'p3',
    categoryId: 'c4',
    category: 'pulses',
    name: 'Toor Dal',
    nameTa: 'துவரம் பருப்பு',
    description: 'Hand-sorted toor dal, stone-milled.',
    images: [],
    unit: 'kg',
    basePricePerUnit: 120,
    currentPricePerUnit: 128,
    minOrderQuantity: 0.5,
    availableQuantity: 80,
    farmerId: 'f3',
    producer: { id: 'f3', name: 'Kumar', entityType: 'farmer' },
    sourceLocation: { district: 'Thanjavur', state: 'TN' },
    grade: 'B' as Product['grade'],
    packagingType: 'bag1kg',
    harvestDate: '2026-09-01T00:00:00.000Z',
    shelfLifeDays: 365,
    deliveryEstimateMins: 100,
    isOrganic: false,
    isOrganicCertified: false,
    certifications: [],
    stockStatus: 'low_stock',
    status: 'rejected',
    avgRating: 4.1,
    totalRatings: 20,
    tags: ['dal'],
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
  },
] as Product[];

export default function AdminProductsPage() {
  const language = useUIStore((state) => state.language);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'archived' | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [reviewTarget, setReviewTarget] = useState<Product | null>(null);

  const filtered = MOCK_PRODUCTS.filter(
    (p) =>
      (status === 'all' || p.status === status) &&
      (query === '' || p.name.toLowerCase().includes(query.toLowerCase()))
  );

  const pending = MOCK_PRODUCTS.filter((p) => p.status === 'pending');

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-charcoal-800">{t('admin.products', language)}</h1>
          <p className="mt-1 text-sm text-charcoal-500">{t('admin.productModeration', language)}</p>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} onDebouncedChange={(v) => { setQuery(v); setPage(1); }} placeholder={t('admin.searchProducts', language)} delay={300} className="sm:w-72" />
          <div className="flex flex-wrap gap-1">
            {(['all', 'pending', 'approved', 'rejected', 'archived'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  status === s ? 'bg-primary-600 text-white' : 'bg-charcoal-100 text-charcoal-600 hover:bg-charcoal-200'
                )}
              >
                {t(`admin.productStatus_${s}`, language) === `admin.productStatus_${s}` ? s : t(`admin.productStatus_${s}`, language)}
              </button>
            ))}
          </div>
        </div>

        {pending.length > 0 && status === 'all' && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-charcoal-800">{t('admin.reviewQueue', language)}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pending.map((p) => (
                <Card key={p.id} hoverable className="cursor-pointer" onClick={() => setReviewTarget(p)}>
                  <ProductMini product={p} />
                </Card>
              ))}
            </div>
          </div>
        )}

        <Card>
          <div className="divide-y divide-charcoal-100">
            {filtered.length === 0 ? (
              <EmptyState
                title={t('admin.noProducts', language)}
                icon={<Package className="h-7 w-7" />}
              />
            ) : (
              filtered.map((product) => (
                <div key={product.id} className="flex flex-wrap items-center gap-4 py-3.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-charcoal-100 text-charcoal-400">
                    <Package className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-charcoal-800">
                      {product.name}
                      {product.isOrganic && <Leaf className="h-3.5 w-3.5 text-primary-600" />}
                      <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
                    </p>
                    <p className="mt-0.5 text-xs text-charcoal-500">
                      {product.producer.name} • {product.producer.entityType} • {product.sourceLocation.district}, {product.sourceLocation.state} • {formatDate(product.createdAt)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-charcoal-100 px-2 py-0.5 text-[10px] text-charcoal-500">
                        {formatCurrency(product.currentPricePerUnit)}/{product.unit}
                      </span>
                      <span className="rounded-full bg-charcoal-100 px-2 py-0.5 text-[10px] text-charcoal-500">
                        {product.availableQuantity} {product.unit} {t('products.available', language)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button className="rounded-lg border border-charcoal-200 p-1.5 text-charcoal-500 hover:border-primary-300 hover:text-primary-700" onClick={() => setReviewTarget(product)}>
                      <Eye className="h-4 w-4" />
                    </button>
                    {product.status === 'pending' && (
                      <>
                        <Button size="sm" className="!bg-green-600 hover:!bg-green-700" onClick={() => toast('success', 'approved')}>
                          <Check className="h-3.5 w-3.5" /> {t('admin.approve', language)}
                        </Button>
                        <Button size="sm" variant="outline" className="!border-red-200 !text-red-500 hover:!bg-red-50" onClick={() => toast('error', 'rejected')}>
                          <X className="h-3.5 w-3.5" /> {t('common.reject', language)}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="mt-6 flex justify-center">
          <Pagination page={page} totalPages={2} onPageChange={setPage} />
        </div>
      </main>

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title={reviewTarget?.name ?? ''}
        subtitle={reviewTarget ? `${reviewTarget.producer.name} • ${reviewTarget.sourceLocation.district}` : ''}
      >
        {reviewTarget && (
          <div className="space-y-2 text-sm">
            <p className="text-charcoal-600">{reviewTarget.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[formatCurrency(reviewTarget.currentPricePerUnit), `${reviewTarget.availableQuantity} ${reviewTarget.unit}`, reviewTarget.grade, reviewTarget.packagingType].map((tag) => (
                <span key={tag} className="rounded-full bg-charcoal-100 px-2.5 py-1 text-[11px] text-charcoal-600">{tag}</span>
              ))}
            </div>
            <p className="border-t border-charcoal-100 pt-2 text-xs text-charcoal-400">
              {t('products.harvested', language)}: {formatDate(reviewTarget.harvestDate)} • {t('products.shelfLife', language)}: {reviewTarget.shelfLifeDays}d
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setReviewTarget(null)}>
                <X className="h-3.5 w-3.5" /> {t('common.cancel', language)}
              </Button>
              {reviewTarget.status === 'pending' && (
                <Button size="sm" onClick={() => { toast('success', 'approved'); setReviewTarget(null); }}>
                  <Check className="h-3.5 w-3.5" /> {t('admin.approve', language)}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Footer />
      <MobileNav />
    </>
  );
}

function ProductMini({ product }: { product: Product }) {
  const language = useUIStore((state) => state.language);
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-charcoal-800">{product.name}</p>
        <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
      </div>
      <p className="mt-1 text-xs text-charcoal-500">
        {product.producer.name} • {formatCurrency(product.currentPricePerUnit)}/{product.unit}
      </p>
    </div>
  );
}

function toast(type: 'success' | 'error', suffix: string) {
  const { toast } = require('sonner') as typeof import('sonner');
  if (type === 'success') toast.success(`Product ${suffix}`);
  else toast.error(`Product ${suffix}`);
}