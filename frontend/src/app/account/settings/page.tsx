'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Bell, MapPin, Lock, Phone, Building, Truck, Package } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card } from '@/components/ui/card';
import { useAuthStore, useUIStore } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/i18n';

function SettingsContent() {
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
    return null;
  }

  const isFarmer = user.role === 'farmer' || user.role === 'fpo';
  const isDelivery = user.role === 'delivery_partner';

  const customerSettings = [
    { key: 'account', label: 'Account Settings', href: '/account', icon: Shield },
    { key: 'delivery', label: 'Delivery Address', href: '/account/addresses', icon: MapPin },
    { key: 'notifications', label: 'Notification Preferences', href: '/account', icon: Bell },
    { key: 'security', label: 'Password & Security', href: '/account', icon: Lock },
  ];

  const farmerSettings = [
    { key: 'business', label: 'Business / Farm Information', href: '/producer/profile', icon: Building },
    { key: 'farmAddress', label: 'Farm / FPO Address', href: '/producer/address', icon: MapPin },
    { key: 'contact', label: 'Contact Information', href: '/producer/profile', icon: Phone },
    { key: 'products', label: 'Product Preferences', href: '/producer/products', icon: Package },
    { key: 'notifications', label: 'Notification Settings', href: '/producer/dashboard', icon: Bell },
    { key: 'security', label: 'Account & Security', href: '/account', icon: Lock },
  ];

  const deliverySettings = [
    { key: 'vehicle', label: 'Vehicle & License', href: '/delivery/dashboard', icon: Truck },
    { key: 'serviceArea', label: 'Service Area', href: '/delivery/dashboard', icon: MapPin },
    { key: 'notifications', label: 'Notification Settings', href: '/delivery/dashboard', icon: Bell },
    { key: 'security', label: 'Account & Security', href: '/account', icon: Lock },
  ];

  const settings = isFarmer ? farmerSettings : isDelivery ? deliverySettings : customerSettings;
  const backHref = isFarmer ? '/producer/dashboard' : '/account';

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href={backHref} className="rounded-lg p-2 hover:bg-charcoal-100">
            <ArrowLeft className="h-5 w-5 text-charcoal-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-charcoal-800">{t('nav.settings', language)}</h1>
            <p className="text-sm text-charcoal-500 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="space-y-3">
          {settings.map(({ key, label, href, icon: Icon }) => (
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
        </div>

        <div className="mt-6 border-t border-charcoal-100 pt-4">
          <button
            onClick={async () => { await logout(); }}
            className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <span className="flex items-center gap-3">
              <Shield className="h-4 w-4" />
              {t('nav.logout', language)}
            </span>
          </button>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="py-8"><div className="mx-auto max-w-3xl px-4"><div className="h-8 w-48 bg-charcoal-100 rounded mb-6"></div><div className="space-y-3"><div className="h-16 bg-charcoal-50 rounded"></div><div className="h-16 bg-charcoal-50 rounded"></div><div className="h-16 bg-charcoal-50 rounded"></div></div></div></div>}>
      <SettingsContent />
    </Suspense>
  );
}
