'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
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

function CategoryPageContent() {
  const params = useParams<{ category: string }>();
  const category = params.category;
  const language = useUIStore((state) => state.language);

  const { data, isLoading, isError, refetch } = useProducts({ category, per_page: 24 });

  return (
    <>
      <PromoStrip />
      <Header />
      <CategoryNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-charcoal-800">
            {t(`categories.${category}`, language) !== `categories.${category}`
              ? t(`categories.${category}`, language)
              : category}
          </h1>
          <p className="mt-1 text-sm text-charcoal-500">{t('products.subtitle', language)}</p>
        </div>

        {isLoading ? (
          <PageLoader text={t('common.loading', language)} />
        ) : (
          <ProductGrid
            products={data?.items ?? []}
            isLoading={false}
            isError={isError}
            onRetry={() => refetch()}
            total={data?.total}
            page={data?.page ?? 1}
            totalPages={data?.totalPages ?? 1}
          />
        )}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CategoryPageContent />
    </Suspense>
  );
}