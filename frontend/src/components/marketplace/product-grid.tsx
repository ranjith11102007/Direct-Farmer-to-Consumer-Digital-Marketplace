'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Filter, SlidersHorizontal, X } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { ProductCard } from './product-card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ProductGridSkeleton } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { FilterPanel, ProductFilters } from './filter-panel';
import { cn } from '@/lib/utils';
import { ShoppingBasket } from 'lucide-react';
import type { Product } from '@/types';

export interface ProductGridProps {
  products?: Product[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  total?: number;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onFiltersChange?: (filters: ProductFilters & { query?: string }) => void;
  showControls?: boolean;
}

const SORT_OPTIONS = [
  { value: 'recommended', label: 'sortBy.recommended' },
  { value: 'price-asc', label: 'sortBy.priceLowToHigh' },
  { value: 'price-desc', label: 'sortBy.priceHighToLow' },
  { value: 'newest', label: 'sortBy.newest' },
  { value: 'rating', label: 'sortBy.bestRated' },
  { value: 'nearest', label: 'sortBy.nearest' },
];

export function ProductGrid({
  products = [],
  isLoading = false,
  isError = false,
  onRetry,
  total,
  page = 1,
  totalPages = 1,
  onPageChange,
  onFiltersChange,
  showControls = true,
}: ProductGridProps) {
  const language = useUIStore((state) => state.language);
  const [sort, setSort] = useState('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({});

  const sortedProducts = useMemo(() => {
    const list = [...products];
    switch (sort) {
      case 'price-asc':
        return list.sort((a, b) => a.currentPricePerUnit - b.currentPricePerUnit);
      case 'price-desc':
        return list.sort((a, b) => b.currentPricePerUnit - a.currentPricePerUnit);
      case 'newest':
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'rating':
        return list.sort((a, b) => b.avgRating - a.avgRating);
      default:
        return list;
    }
  }, [products, sort]);

  const applyFilters = (newFilters: ProductFilters) => {
    setFilters(newFilters);
    setFiltersOpen(false);
    onFiltersChange?.({ ...newFilters });
  };

  const clearAll = () => {
    setFilters({});
    onFiltersChange?.({});
  };

  if (isError) {
    return (
      <EmptyState
        title={t('error.somethingWentWrong', language)}
        description={t('products.errorLoading', language)}
        icon={<Filter className="h-7 w-7" />}
        action={<Button onClick={onRetry} variant="outline">{t('common.retry', language)}</Button>}
      />
    );
  }

  return (
    <div className="w-full">
      {showControls && (
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(filtersOpen && 'bg-primary-50 border-primary-400 text-primary-700')}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t('products.filters.title', language)}
            {Object.keys(filters).length > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                {Object.keys(filters).length}
              </span>
            )}
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-charcoal-500">
              {t('products.filters.showing', language)} {products.length}{' '}
              {t('products.filters.of', language)} {total ?? products.length}{' '}
              {t('products.filters.results', language)}
            </span>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              options={SORT_OPTIONS.map((opt) => ({ value: opt.value, label: t(`products.${opt.label}`, language) }))}
              className="w-44 py-2"
              icon={<ArrowUpDown className="h-3.5 w-3.5" />}
              aria-label={t('products.sortBy.label', language)}
            />
          </div>
        </div>
      )}

      <div className={cn('grid gap-4', showControls ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-4')}>
        {isLoading ? (
          <div className="col-span-full">
            <ProductGridSkeleton count={showControls ? 8 : 10} />
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title={t('products.noProducts', language)}
              icon={<ShoppingBasket className="h-7 w-7" />}
              action={
                <Button variant="outline" size="sm" onClick={clearAll}>
                  {t('products.filters.clearAll', language)}
                </Button>
              }
            />
          </div>
        ) : (
          sortedProducts.map((product) => (
            <div key={product.id} className={cn(showControls && 'lg:col-span-1')}>
              <ProductCard product={product} />
            </div>
          ))
        )}
      </div>

      {showControls && totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange ?? (() => undefined)} />
        </div>
      )}

      {filtersOpen && showControls && (
        <div className="mb-6 rounded-xl border border-charcoal-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-charcoal-800">{t('products.filters.title', language)}</h3>
            <button onClick={() => setFiltersOpen(false)} aria-label={t('common.close', language)} className="rounded p-1 text-charcoal-400 hover:text-charcoal-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <FilterPanel filters={filters} onChange={applyFilters} onClear={clearAll} />
        </div>
      )}
    </div>
  );
}