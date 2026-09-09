'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { CategoryNav } from '@/components/layout/category-nav';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ProductGrid } from '@/components/marketplace/product-grid';
import { PageLoader } from '@/components/ui/loading';
import { useProducts } from '@/hooks/useApi';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import type { ProductFilters } from '@/components/marketplace/filter-panel';

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const language = useUIStore((state) => state.language);
  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? undefined;
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<ProductFilters & { query?: string }>({
    query: query || undefined,
  });

  const { data, isLoading, isError, refetch } = useProducts({
    q: activeFilters.query || query || undefined,
    category: activeFilters.categories?.[0] ?? category,
    page,
    per_page: 12,
    organic: activeFilters.organicOnly || undefined,
    price_min: activeFilters.priceMin,
    price_max: activeFilters.priceMax,
    max_distance: activeFilters.maxDistance,
    producer_type: activeFilters.producerType,
    grades: activeFilters.grades?.join(','),
    harvest_within_days: activeFilters.harvestWithinDays,
  });

  const handleFiltersChange = (filters: ProductFilters & { query?: string }) => {
    setActiveFilters(filters);
    setPage(1);
  };

  return (
    <>
      <PromoStrip />
      <Header />
      <CategoryNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-charcoal-800">
            {query ? (
              <>
                {t('search.noResults', language).replace('for', 'for')} &ldquo;{query}&rdquo;
              </>
            ) : (
              t('products.title', language)
            )}
          </h1>
          <p className="mt-1 text-sm text-charcoal-500">{t('products.subtitle', language)}</p>
        </div>

        <ProductGrid
          products={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          total={data?.total}
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
          onFiltersChange={handleFiltersChange}
        />
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MarketplaceContent />
    </Suspense>
  );
}