'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, TrendingUp, Wallet, Link2, ClipboardList, Users, BarChart3, Truck, ShoppingCart, Bell, Plus, MapPin, Settings, User, Package } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';

export interface SidebarProps {
  items: Array<{ key: string; href: string; icon: React.ComponentType<{ className?: string }> }>;
  title?: string;
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({ items, title, footer, className }: SidebarProps) {
  const language = useUIStore((state) => state.language);

  return (
    <aside className={cn('w-64 shrink-0 border-r border-charcoal-100 bg-white', className)}>
      {title && (
        <div className="border-b border-charcoal-100 px-4 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-charcoal-500">{title}</h2>
        </div>
      )}
      <nav className="flex flex-col gap-0.5 p-2" aria-label={title}>
        {items.map(({ key, href, icon: Icon }) => (
          <SidebarLink key={key} href={href} icon={<Icon className="h-4 w-4" />} active={false}>
            {key === 'home' ? t('nav.home', language) : t(`nav.${key}`, language) !== `nav.${key}` ? t(`nav.${key}`, language) : key}
          </SidebarLink>
        ))}
      </nav>
      {footer && <div className="border-t border-charcoal-100 p-4">{footer}</div>}
    </aside>
  );
}

export function SidebarLink({
  href,
  icon,
  children,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}) {
  const pathname = usePathname();
  const isActive = active ?? (pathname === href || (href !== '/' && pathname.startsWith(href)));

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-charcoal-600 hover:bg-charcoal-50 hover:text-charcoal-900'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      {children}
    </Link>
  );
}

export const NAV_GROUPS = {
  consumer: [
    { key: 'home', href: '/', icon: Home },
    { key: 'marketplace', href: '/marketplace', icon: LayoutGrid },
    { key: 'cart', href: '/cart', icon: ShoppingCart },
    { key: 'myOrders', href: '/orders', icon: Package },
    { key: 'addresses', href: '/account/addresses', icon: MapPin },
    { key: 'settings', href: '/account/settings', icon: Settings },
  ],
  farmer: [
    { key: 'home', href: '/producer/dashboard', icon: Home },
    { key: 'products', href: '/producer/products', icon: ClipboardList },
    { key: 'addProduct', href: '/producer/products?new=1', icon: Plus },
    { key: 'incomingOrders', href: '/producer/orders', icon: Bell },
    { key: 'forecasts', href: '/producer/forecasts', icon: TrendingUp },
    { key: 'settlements', href: '/producer/settlements', icon: Wallet },
    { key: 'profile', href: '/producer/profile', icon: User },
    { key: 'settings', href: '/producer/settings', icon: Settings },
  ],
  delivery: [
    { key: 'home', href: '/delivery/dashboard', icon: Home },
    { key: 'deliveries', href: '/delivery/dashboard', icon: Truck },
    { key: 'notifications', href: '/delivery/dashboard', icon: Bell },
    { key: 'profile', href: '/account', icon: User },
    { key: 'settings', href: '/account/settings', icon: Settings },
  ],
  admin: [
    { key: 'dashboard', href: '/admin/dashboard', icon: Home },
    { key: 'users', href: '/admin/users', icon: Users },
    { key: 'products', href: '/admin/products', icon: ClipboardList },
    { key: 'orders', href: '/admin/orders', icon: Link2 },
    { key: 'analytics', href: '/admin/analytics', icon: BarChart3 },
    { key: 'settlements', href: '/admin/settlements', icon: Wallet },
    { key: 'forecasts', href: '/admin/forecasts', icon: TrendingUp },
  ],
  bulk: [
    { key: 'home', href: '/bulk', icon: Home },
    { key: 'requirements', href: '/bulk/requirements', icon: ClipboardList },
    { key: 'settings', href: '/account/settings', icon: Settings },
  ],
} as const;
