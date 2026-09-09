'use client';

import Link from 'next/link';
import { ChevronRight, CalendarDays } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { ProductCard } from './product-card';
import { ProductCardSkeleton } from '@/components/ui/loading';
import { useProducts } from '@/hooks/useApi';
import type { Product } from '@/types';

export interface SeasonalProductsProps {
  products?: Product[];
  isLoading?: boolean;
  tag?: string;
}

export function SeasonalProducts({ products, isLoading }: SeasonalProductsProps) {
  const language = useUIStore((state) => state.language);

  const query = useProducts({ featured: 'true', per_page: 8 });
  const resolvedProducts = products ?? query.data?.items ?? [];
  const resolvedLoading = isLoading ?? query.isLoading;

  return (
    <section className="bg-gradient-to-b from-secondary-50/60 to-white py-10" aria-label={t('products.seasonal', language)}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-charcoal-800">{t('products.seasonal', language)}</h2>
              <p className="text-sm text-charcoal-500">{t('products.seasonalSubtitle', language)}</p>
            </div>
          </div>
          <Link href="/marketplace?seasonal=true" className="hidden items-center gap-1 text-sm font-medium text-primary-700 hover:underline sm:flex">
            {t('footer.explore', language)}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {resolvedLoading ? (
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="w-56 shrink-0 sm:w-64">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        ) : resolvedProducts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-charcoal-200 py-10 text-center text-sm text-charcoal-500">
            {t('products.noProducts', language)}
          </p>
        ) : (
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {resolvedProducts.slice(0, 8).map((product) => (
              <div key={product.id} className="w-56 shrink-0 sm:w-64">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
      <style jsx global>{`
        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}