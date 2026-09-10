'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf, Package, Settings, LogOut, MapPin, User, Truck } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/loading';
import { useAuthStore, useUIStore } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/i18n';
import { getInitials } from '@/lib/utils';

function AccountContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const language = useUIStore((state) => state.language);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return <PageLoader />;
  }

  const isFarmer = user.role === 'farmer' || user.role === 'fpo';
  const isDelivery = user.role === 'delivery_partner';

  const customerMenuItems = [
    { key: 'profile', label: t('nav.profile', language), href: '/account', icon: User },
    { key: 'orders', label: t('nav.myOrders', language), href: '/orders', icon: Package },
    { key: 'addresses', label: t('nav.addresses', language), href: '/account/addresses', icon: MapPin },
    { key: 'settings', label: t('nav.settings', language), href: '/account/settings', icon: Settings },
  ];

  const farmerMenuItems = [
    { key: 'home', label: t('nav.home', language), href: '/producer/dashboard', icon: Leaf },
    { key: 'profile', label: t('nav.profile', language), href: '/producer/profile', icon: User },
    { key: 'products', label: t('nav.products', language), href: '/producer/products', icon: Package },
    { key: 'settings', label: t('nav.settings', language), href: '/producer/settings', icon: Settings },
  ];

  const deliveryMenuItems = [
    { key: 'dashboard', label: t('delivery.dashboard', language), href: '/delivery/dashboard', icon: Truck },
    { key: 'profile', label: t('nav.profile', language), href: '/account', icon: User },
    { key: 'settings', label: t('nav.settings', language), href: '/account/settings', icon: Settings },
  ];

  const menuItems = isFarmer ? farmerMenuItems : isDelivery ? deliveryMenuItems : customerMenuItems;

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-2xl font-bold text-white">
            {getInitials(user.name ?? user.phoneNumber ?? 'U')}
          </span>
          <div>
            <h1 className="text-xl font-bold text-charcoal-800">{user.name}</h1>
            <p className="text-sm text-charcoal-500 capitalize">
              {user.role.replace('_', ' ')} • {user.email ?? user.phoneNumber ?? t('auth.phone', language)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {menuItems.map(({ key, label, href, icon: Icon }) => (
            <Link key={key} href={href}>
              <Card hoverable className="flex items-center justify-between px-4 py-3.5">
                <span className="flex items-center gap-3 text-sm font-medium text-charcoal-800">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </span>
              </Card>
            </Link>
          ))}

          <Card className="flex items-center justify-between px-4 py-3.5">
            <span className="flex items-center gap-3 text-sm font-medium text-charcoal-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500">
                <LogOut className="h-4 w-4" />
              </span>
              {t('nav.logout', language)}
            </span>
            <button onClick={async () => { await logout(); }} className="text-sm font-semibold text-red-600 hover:underline">
              <LogOut className="h-4 w-4" />
            </button>
          </Card>
        </div>

        <Link href="/" className="mt-6 flex items-center justify-center gap-1.5 text-xs text-charcoal-400 hover:text-primary-700">
          <Leaf className="h-3.5 w-3.5" />
          <span>{t('app.name', language)}</span>
        </Link>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AccountContent />
    </Suspense>
  );
}
