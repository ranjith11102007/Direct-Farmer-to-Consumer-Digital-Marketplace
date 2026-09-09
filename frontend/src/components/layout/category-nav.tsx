'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Carrot,
  Apple,
  Wheat,
  Bean,
  Flame,
  Flower2,
  Milk,
  Leaf,
  Package,
  Sprout,
  ShoppingBasket,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';
import type { ProductCategory } from '@/types';

const CATEGORY_META: Record<ProductCategory, { icon: LucideIcon }> = {
  vegetables: { icon: Carrot },
  fruits: { icon: Apple },
  grains: { icon: Wheat },
  pulses: { icon: Bean },
  spices: { icon: Flame },
  oilseeds: { icon: Flower2 },
  dairy: { icon: Milk },
  organic: { icon: Leaf },
  processed: { icon: Package },
  seeds: { icon: Sprout },
  bulk: { icon: ShoppingBasket },
  seasonal: { icon: CalendarDays },
};

const CATEGORY_ORDER: ProductCategory[] = [
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

export function CategoryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const language = useUIStore((state) => state.language);

  const activeCategory = (pathname.match(/^\/marketplace\/(.+)/) ?? [])[1] as ProductCategory | undefined;

  const handleNavigate = (category: ProductCategory) => {
    router.push(`/marketplace/${category}`);
  };

  return (
    <nav
      className="border-b border-charcoal-100 bg-white"
      aria-label="Categories"
    >
      <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2">
        <NavItem
          label={t('categories.all', language)}
          active={!activeCategory}
          onClick={() => router.push('/marketplace')}
        />
        {CATEGORY_ORDER.map((category) => {
          const Icon = CATEGORY_META[category].icon;
          return (
            <NavItem
              key={category}
              label={t(`categories.${category}`, language)}
              icon={<Icon className="h-4 w-4" />}
              active={activeCategory === category}
              onClick={() => handleNavigate(category)}
            />
          );
        })}
      </div>

      <style jsx global>{`
        .no-scrollbar {
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </nav>
  );
}

function NavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary-600 text-white shadow-sm'
          : 'text-charcoal-600 hover:bg-primary-50 hover:text-primary-700'
      )}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      {label}
    </button>
  );
}