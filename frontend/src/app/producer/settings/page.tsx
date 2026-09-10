'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building, MapPin, Phone, Bell, Lock, LogOut, Package, Settings } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card } from '@/components/ui/card';
import { useAuthStore, useUIStore } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/i18n';

export default function FarmerSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const language = useUIStore((state) => state.language);

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  const settingsItems = [
    { key: 'business', label: 'Business / Farm Information', href: '/producer/profile', icon: Building },
    { key: 'farmAddress', label: 'Farm / FPO Address', href: '/producer/address', icon: MapPin },
    { key: 'contact', label: 'Contact Information', href: '/producer/profile', icon: Phone },
    { key: 'products', label: 'Product Preferences', href: '/producer/products', icon: Package },
    { key: 'notifications', label: 'Notification Settings', href: '/producer/dashboard', icon: Bell },
    { key: 'security', label: 'Account & Security', href: '/account/settings', icon: Lock },
  ];

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/producer/dashboard" className="rounded-lg p-2 hover:bg-charcoal-100">
            <ArrowLeft className="h-5 w-5 text-charcoal-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-charcoal-800">{t('nav.settings', language)}</h1>
            <p className="text-sm text-charcoal-500">Farmer / FPO Settings</p>
          </div>
        </div>

        <div className="space-y-3">
          {settingsItems.map(({ key, label, href, icon: Icon }) => (
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
              <LogOut className="h-4 w-4" />
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
