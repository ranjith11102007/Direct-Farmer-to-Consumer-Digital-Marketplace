'use client';

import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { ProductCard } from './product-card';
import { useProducts } from '@/hooks/useApi';
import { ProductCardSkeleton } from '@/components/ui/loading';

export function NearbyProducts() {
  const language = useUIStore((state) => state.language);
  const query = useProducts({ nearby: 'true', per_page: 8 });

  return (
    <section className="mx-auto max-w-7xl px-4 py-10" aria-label={t('products.nearby', language)}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-charcoal-800">{t('products.nearby', language)}</h2>
            <p className="text-sm text-charcoal-500">{t('products.nearbySubtitle', language)}</p>
          </div>
        </div>
        <Link href="/marketplace?nearby=true" className="hidden items-center gap-1 text-sm font-medium text-primary-700 hover:underline sm:flex">
          {t('footer.explore', language)}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : query.data && query.data.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {query.data.items.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-charcoal-200 py-10 text-center text-sm text-charcoal-500">
          {t('products.noProducts', language)}
        </p>
      )}
    </section>
  );
}