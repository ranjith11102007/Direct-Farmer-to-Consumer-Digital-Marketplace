'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  Plus,
  Package,
  Pencil,
  Trash2,
  Search,
  Leaf,
  ArrowUpDown,
} from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { PageLoader } from '@/components/ui/loading';
import { SearchInput } from '@/components/ui/search-input';
import { InventoryForm } from '@/components/producer/inventory-form';
import { EmptyState } from '@/components/ui/empty-state';
import { useProducts, useDeleteMutation } from '@/hooks/useApi';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  archived: 'neutral',
};

const STOCK_VARIANT: Record<string, 'success' | 'danger' | 'warning'> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

function ProducerProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const language = useUIStore((state) => state.language);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const showNew = searchParams.get('new') === '1';

  const { data, isLoading } = useProducts({ page, per_page: 9, mine: true, q: query || undefined });
  const products = data?.items ?? [];

  const deleteMutation = useDeleteMutation('products', '/products', t('producer.productDeleted', language));

  if (showNew) {
    return (
      <main>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-charcoal-800">{t('producer.addProduct', language)}</h1>
            <Button variant="outline" onClick={() => router.push('/producer/products')}>
              {t('common.back', language)}
            </Button>
          </div>
          <InventoryForm onSubmit={async () => {
            router.push('/producer/products');
          }} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-charcoal-800">{t('producer.products', language)}</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            {data ? `${data.total} ${t('producer.itemsListed', language)}` : ''}
          </p>
        </div>
        <Link href="/producer/products?new=1">
          <Button>
            <Plus className="h-4 w-4" /> {t('producer.addProduct', language)}
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          onDebouncedChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder={t('producer.searchProducts', language)}
          delay={400}
          className="sm:w-72"
        />
        <div className="ml-auto flex items-center gap-1">
          <ArrowUpDown className="h-3.5 w-3.5 text-charcoal-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-charcoal-200 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
          >
            <option value="newest">{t('producer.sortNewest', language)}</option>
            <option value="price_asc">{t('producer.sortPriceAsc', language)}</option>
            <option value="stock">{t('producer.sortStock', language)}</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : products.length === 0 ? (
        <EmptyState
          title={t('producer.noProducts', language)}
          description={t('producer.noProductsSubtitle', language)}
          icon={<Package className="h-7 w-7" />}
          action={
            <Link href="/producer/products?new=1">
              <Button>
                <Plus className="h-4 w-4" /> {t('producer.addProduct', language)}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <Link href={`/product/${product.id}`} className="block">
                <div className="relative flex h-40 items-center justify-center bg-charcoal-50">
                  <Package className="h-10 w-10 text-charcoal-300" />
                  {product.isOrganic && (
                    <Badge variant="success" className="absolute left-2 top-2" icon={<Leaf className="h-3 w-3" />}>
                      {t('products.organic', language)}
                    </Badge>
                  )}
                  <Badge variant={STOCK_VARIANT[product.stockStatus]} className="absolute right-2 top-2">
                    {t(`products.${product.stockStatus}`, language)}
                  </Badge>
                </div>
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-charcoal-800">{product.name}</p>
                    <p className="text-xs text-charcoal-400">
                      {formatCurrency(product.currentPricePerUnit)}/{product.unit} • {product.availableQuantity} {product.unit}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[product.status]}>
                    {t(`producer.${product.status}`, language) === `producer.${product.status}` ? product.status : t(`producer.${product.status}`, language)}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-charcoal-500">{product.description}</p>
                <div className="mt-3 flex items-center justify-between border-t border-charcoal-100 pt-3">
                  <span className="text-[11px] text-charcoal-400">{formatDate(product.createdAt)}</span>
                  <div className="flex gap-1">
                    <Link href={`/producer/products?edit=${product.id}&new=1`}>
                      <button className="rounded-lg border border-charcoal-200 p-1.5 text-charcoal-500 transition-colors hover:border-primary-300 hover:text-primary-700">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(product.id)}
                      className="rounded-lg border border-red-200 p-1.5 text-red-500 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
        </div>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t('producer.deleteTitle', language)}
        subtitle={t('producer.deleteSubtitle', language)}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel', language)}</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={async () => {
              if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget);
              setDeleteTarget(null);
            }}
          >
            {t('common.confirm', language)}
          </Button>
        </div>
      </Modal>
    </main>
  );
}

export default function ProducerProductsPage() {
  return (
    <>
      <PromoStrip />
      <Header />
      <Suspense fallback={<div className="py-8"><PageLoader /></div>}>
        <ProducerProductsContent />
      </Suspense>
      <Footer />
      <MobileNav />
    </>
  );
}