'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Leaf,
  Menu,
  MapPin,
  Search,
  Bell,
  Heart,
  ShoppingCart,
  User,
  Languages,
  ChevronDown,
} from 'lucide-react';
import { t } from '@/i18n';
import { useAuthStore, useCartStore, useUIStore, useLocationStore } from '@/store';
import { LocationSelector } from './location-selector';
import { SearchInput } from '@/components/ui/search-input';
import { cn } from '@/lib/utils';

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);
  const { language, setLanguage, setSidebarOpen } = useUIStore();
  const selectedAddress = useLocationStore((state) => state.selectedAddress);
  const [locationOpen, setLocationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ta' : 'en');
  };

  const goToCart = () => router.push('/cart');
  const goToOrders = () => router.push('/orders');
  const goToProfile = () => router.push('/account');
  const goToLogin = () => router.push('/login');

  return (
    <header className="sticky top-0 z-40 border-b border-charcoal-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-4 px-4 py-3">
        <button
          className="rounded-lg p-2 text-charcoal-600 hover:bg-primary-50 lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-1.5" aria-label={t('app.name', language)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="hidden text-xl font-bold tracking-tight text-primary-700 sm:block">
            {t('app.name', language)}
          </span>
        </Link>

        <button
          className="hidden items-center gap-1.5 rounded-full border border-charcoal-200 bg-charcoal-50 px-3 py-1.5 text-sm text-charcoal-700 transition-colors hover:border-primary-300 hover:bg-primary-50 md:flex"
          onClick={() => setLocationOpen(true)}
          aria-label={t('location.deliverTo', language)}
        >
          <MapPin className="h-4 w-4 text-primary-600" />
          <span className="max-w-40 truncate">
            {selectedAddress
              ? selectedAddress.district || selectedAddress.city || t('location.deliverTo', language)
              : <span>{t('location.enterPincode', language)}</span>}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-charcoal-400" />
        </button>

        <div className="hidden flex-1 max-w-md mx-2 lg:block">
          <SearchInput
            placeholder={t('search.placeholder', language)}
            suggestions={[
              t('categories.tomato', language) === 'categories.tomato' ? 'Tomato' : t('categories.tomato', language),
              'Organic',
              'Millets',
              'Banana',
            ]}
          />
        </div>

        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-1.5">
          <button
            className="rounded-lg p-2 text-charcoal-600 transition-colors hover:bg-primary-50 hover:text-primary-700 lg:hidden"
            onClick={() => setSearchVisible((v) => !v)}
            aria-label={t('common.search', language)}
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 rounded-full border border-charcoal-200 px-2.5 py-1.5 text-xs font-semibold text-charcoal-700 transition-colors hover:border-primary-300 hover:text-primary-700"
            aria-label={t('common.language', language)}
            title={language === 'en' ? 'தமிழ்' : 'English'}
          >
            <Languages className="h-3.5 w-3.5" />
            {language === 'en' ? 'தமிழ்' : 'EN'}
          </button>

          <button
            className="relative rounded-lg p-2 text-charcoal-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
            onClick={goToProfile}
            aria-label={t('nav.wishlist', language)}
          >
            <Heart className="h-5 w-5" />
          </button>

          <button
            className="relative rounded-lg p-2 text-charcoal-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
            onClick={goToCart}
            aria-label={t('nav.cart', language)}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white shadow-sm">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          <button
            className="relative hidden rounded-lg p-2 text-charcoal-600 transition-colors hover:bg-primary-50 hover:text-primary-700 sm:block"
            onClick={goToOrders}
            aria-label={t('nav.notifications', language)}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-primary-500" />
          </button>

          <div className="relative">
            {isAuthenticated && user ? (
              <button
                className="flex items-center gap-2 rounded-full border border-charcoal-200 p-1 pl-1 pr-2 transition-colors hover:border-primary-300"
                onClick={() => setAccountOpen((o) => !o)}
                aria-expanded={accountOpen}
                aria-label={t('nav.account', language)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                  {user.name?.[0]?.toUpperCase() ?? 'U'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-charcoal-400" />
              </button>
            ) : (
              <button
                onClick={goToLogin}
                className="flex items-center gap-1.5 rounded-full bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                <User className="h-4 w-4" />
                {t('nav.login', language)}
              </button>
            )}

            {accountOpen && user && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-charcoal-200 bg-white shadow-lg animate-slide-down">
                <div className="border-b border-charcoal-100 px-4 py-3">
                  <p className="font-medium text-charcoal-800">{user.name}</p>
                  <p className="text-xs text-charcoal-500">{user.phoneNumber}</p>
                </div>
                <div className="py-1">
                  <DropdownItem onClick={goToProfile}>{t('nav.profile', language)}</DropdownItem>
                  <DropdownItem onClick={goToOrders}>{t('nav.myOrders', language)}</DropdownItem>
                  <DropdownItem
                    onClick={() => router.push(user.role === 'farmer' || user.role === 'fpo' ? '/producer/dashboard' : '/bulk')}
                  >
                    {user.role === 'farmer' || user.role === 'fpo'
                      ? t('nav.producerDashboard', language)
                      : t('nav.buyBulk', language)}
                  </DropdownItem>
                  <DropdownItem onClick={() => router.push('/orders')}>{t('nav.settings', language)}</DropdownItem>
                  <div className="border-t border-charcoal-100 pt-1">
                    <DropdownItem onClick={goToLogin}>
                      <span className="text-red-600">{t('nav.logout', language)}</span>
                    </DropdownItem>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {searchVisible && (
        <div className="px-4 pb-3 lg:hidden">
          <SearchInput placeholder={t('search.placeholder', language)} autoFocus />
        </div>
      )}

      <LocationSelector open={locationOpen} onClose={() => setLocationOpen(false)} />
    </header>
  );
}

function DropdownItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full px-4 py-2 text-left text-sm text-charcoal-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
    >
      {children}
    </button>
  );
}