'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, Package, User, Sprout, Bell, Truck, MapPin } from 'lucide-react';
import { t } from '@/i18n';
import { useCartStore, useAuthStore, useUIStore } from '@/store';
import { cn } from '@/lib/utils';

const customerItems = [
  { key: 'home', href: '/', icon: Home },
  { key: 'categories', href: '/marketplace', icon: LayoutGrid },
  { key: 'cart', href: '/cart', icon: ShoppingCart },
  { key: 'orders', href: '/orders', icon: Package },
  { key: 'account', href: '/login', icon: User },
] as const;

const farmerItems = [
  { key: 'home', href: '/producer/dashboard', icon: Home },
  { key: 'products', href: '/producer/products', icon: Sprout },
  { key: 'orders', href: '/producer/orders', icon: Bell },
  { key: 'account', href: '/producer/profile', icon: User },
] as const;

const deliveryItems = [
  { key: 'home', href: '/delivery/dashboard', icon: Home },
  { key: 'deliveries', href: '/delivery/dashboard', icon: Truck },
  { key: 'notifications', href: '/delivery/dashboard', icon: Bell },
  { key: 'account', href: '/account', icon: User },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const cartItems = useCartStore((state) => state.items);
  const { user, isAuthenticated } = useAuthStore();
  const language = useUIStore((state) => state.language);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const isFarmer = user?.role === 'farmer' || user?.role === 'fpo';
  const isDelivery = user?.role === 'delivery_partner';
  const items = isFarmer ? farmerItems : isDelivery ? deliveryItems : customerItems;
  const gridCols = items.length === 5 ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <nav className={`fixed inset-x-0 bottom-0 z-40 border-t border-charcoal-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden`} aria-label="Mobile navigation">
      <div className={`grid ${gridCols}`}>
        {items.map(({ key, href, icon: Icon }) => {
          const active = pathname === href || 
            (key === 'categories' && pathname.startsWith('/marketplace')) || 
            (key === 'products' && pathname.startsWith('/producer/products')) || 
            (key === 'orders' && pathname.startsWith('/producer/orders')) || 
            (key === 'home' && ((isFarmer && pathname.startsWith('/producer')) || (!isFarmer && !isDelivery && pathname === '/') || (isDelivery && pathname.startsWith('/delivery'))));
          const isCart = key === 'cart';
          const isAccount = key === 'account';
          let finalHref = href;
          if (isAccount) {
            if (isAuthenticated && isFarmer) finalHref = '/producer/profile';
            else if (isAuthenticated && isDelivery) finalHref = '/account';
            else if (isAuthenticated) finalHref = '/account';
          }

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
                {t(`nav.${key}`, language)}
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
