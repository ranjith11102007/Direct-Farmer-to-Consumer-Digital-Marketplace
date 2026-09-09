'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, Package, User, Leaf } from 'lucide-react';
import { t } from '@/i18n';
import { useCartStore, useAuthStore, useUIStore } from '@/store';
import { cn } from '@/lib/utils';

const items = [
  { key: 'home', href: '/', icon: Home },
  { key: 'categories', href: '/marketplace', icon: LayoutGrid },
  { key: 'cart', href: '/cart', icon: ShoppingCart },
  { key: 'orders', href: '/orders', icon: Package },
  { key: 'account', href: '/login', icon: User },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const cartItems = useCartStore((state) => state.items);
  const { user, isAuthenticated } = useAuthStore();
  const language = useUIStore((state) => state.language);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-charcoal-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Mobile navigation">
      <div className="grid grid-cols-5">
        {items.map(({ key, href, icon: Icon }) => {
          const active = pathname === href || (key === 'categories' && pathname.startsWith('/marketplace'));
          const isCart = key === 'cart';
          const isAccount = key === 'account';
          const finalHref = isAccount && isAuthenticated ? '/account' : href;

          return (
            <Link
              key={key}
              href={finalHref}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-primary-700' : 'text-charcoal-500 hover:text-charcoal-800'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {isCart && cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-0.5 text-[9px] font-bold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </span>
              <span className={cn(language === 'ta' && 'font-tamil')}>
                {key === 'cart' && cartCount > 0
                  ? t(`nav.${key}`, language)
                  : t(`nav.${key}`, language)}
              </span>
            </Link>
          );
        })}
      </div>
      <style jsx global>{`
        @media (min-width: 1024px) {
          nav.lg\\:hidden {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}