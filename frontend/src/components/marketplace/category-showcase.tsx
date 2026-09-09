'use client';

import Link from 'next/link';
import { ArrowRight, Carrot, Apple, Wheat, Bean, Flame, Flower2, Milk, Leaf, Package, Sprout, ShoppingBasket, CalendarDays, type LucideIcon } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';
import type { ProductCategory } from '@/types';

const CATEGORY_META: Record<ProductCategory, { icon: LucideIcon; gradient: string }> = {
  vegetables: { icon: Carrot, gradient: 'from-green-500 to-emerald-700' },
  fruits: { icon: Apple, gradient: 'from-rose-500 to-red-700' },
  grains: { icon: Wheat, gradient: 'from-amber-500 to-orange-700' },
  pulses: { icon: Bean, gradient: 'from-lime-500 to-green-700' },
  spices: { icon: Flame, gradient: 'from-red-500 to-rose-700' },
  oilseeds: { icon: Flower2, gradient: 'from-yellow-500 to-amber-700' },
  dairy: { icon: Milk, gradient: 'from-sky-500 to-blue-700' },
  organic: { icon: Leaf, gradient: 'from-emerald-500 to-teal-700' },
  processed: { icon: Package, gradient: 'from-teal-500 to-cyan-700' },
  seeds: { icon: Sprout, gradient: 'from-lime-500 to-emerald-700' },
  bulk: { icon: ShoppingBasket, gradient: 'from-indigo-500 to-violet-700' },
  seasonal: { icon: CalendarDays, gradient: 'from-orange-500 to-accent-700' },
};

const ORDER: ProductCategory[] = [
  'vegetables',
  'fruits',
  'grains',
  'pulses',
  'spices',
  'oilseeds',
  'dairy',
  'organic',
  'processed',
  'seeds',
  'bulk',
  'seasonal',
];

export function CategoryShowcase() {
  const language = useUIStore((state) => state.language);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-charcoal-800 sm:text-2xl">{t('categories.browsellCategories', language)}</h2>
          <p className="mt-1 text-sm text-charcoal-500">{t('marketplaceSection.subtitle', language)}</p>
        </div>
        <Link href="/marketplace" className="hidden items-center gap-1 text-sm font-medium text-primary-700 hover:underline sm:flex">
          {t('footer.explore', language)}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {ORDER.map((category) => {
          const { icon: Icon, gradient } = CATEGORY_META[category];
          return (
            <Link
              key={category}
              href={`/marketplace/${category}`}
              className="group flex flex-col items-center gap-3 rounded-xl border border-charcoal-200/70 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
            >
              <span className={cn('flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm transition-transform group-hover:scale-105', gradient)}>
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-xs font-semibold leading-tight text-charcoal-800">{t(`categories.${category}`, language)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}