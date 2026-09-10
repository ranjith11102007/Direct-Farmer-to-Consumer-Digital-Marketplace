'use client';

import { useState, useEffect, useRef } from 'react';
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
  Home,
  Package,
  Settings,
  LogOut,
  Sprout,
  Truck,
} from 'lucide-react';
import { t } from '@/i18n';
import { useAuthStore, useCartStore, useUIStore, useLocationStore, useNotificationsStore } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { LocationSelector } from './location-selector';
import { SearchInput } from '@/components/ui/search-input';
import { cn } from '@/lib/utils';

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const cartItems = useCartStore((state) => state.items);
  const { language, setLanguage, setSidebarOpen } = useUIStore();
  const selectedAddress = useLocationStore((state) => state.selectedAddress);
  const [locationOpen, setLocationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const unreadCount = useNotificationsStore((s) => user ? s.getUnreadCount(user.id) : 0);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ta' : 'en');
  };

  const isFarmer = user?.role === 'farmer' || user?.role === 'fpo';
  const isDelivery = user?.role === 'delivery_partner';
  const isConsumer = user?.role === 'consumer';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setAccountOpen(false);
    logout();
  };

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
            onClick={() => router.push(isAuthenticated ? '/' : '/login')}
            aria-label={t('nav.home', language)}
          >
            <Home className="h-5 w-5" />
          </button>

          {(isConsumer || !isAuthenticated) && (
            <button
              className="relative rounded-lg p-2 text-charcoal-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
              onClick={() => router.push('/cart')}
              aria-label={t('nav.cart', language)}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white shadow-sm">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          )}

          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <button
                className="relative rounded-lg p-2 text-charcoal-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label={t('nav.notifications', language)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-charcoal-200 bg-white shadow-lg animate-slide-down">
                  <div className="border-b border-charcoal-100 px-4 py-3">
                    <p className="font-semibold text-charcoal-800">{t('nav.notifications', language)}</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {user && (() => {
                      const notifs = useNotificationsStore.getState().getNotificationsByUser(user.id);
                      if (notifs.length === 0) {
                        return (
                          <div className="px-4 py-8 text-center text-sm text-charcoal-400">
                            No notifications yet
                          </div>
                        );
                      }
                      return notifs.slice(0, 10).map((notif) => (
                        <button
                          key={notif.id}
                          className={cn(
                            'block w-full px-4 py-3 text-left transition-colors hover:bg-charcoal-50',
                            !notif.read && 'bg-primary-50/50'
                          )}
                          onClick={() => {
                            useNotificationsStore.getState().markAsRead(notif.id);
                            if (notif.link) router.push(notif.link);
                            setNotifOpen(false);
                          }}
                        >
                          <p className="text-sm font-medium text-charcoal-800">{notif.title}</p>
                          <p className="mt-0.5 text-xs text-charcoal-500 line-clamp-2">{notif.message}</p>
                          <p className="mt-1 text-[10px] text-charcoal-400">{new Date(notif.createdAt).toLocaleString()}</p>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={accountRef}>
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
                onClick={() => router.push('/login')}
                className="flex items-center gap-1.5 rounded-full bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                <User className="h-4 w-4" />
                {t('nav.login', language)}
              </button>
            )}

            {accountOpen && user && (
              <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-charcoal-200 bg-white shadow-lg animate-slide-down">
                <div className="border-b border-charcoal-100 px-4 py-3">
                  <p className="font-medium text-charcoal-800">{user.name}</p>
                  <p className="text-xs text-charcoal-500 capitalize">{user.role.replace('_', ' ')}</p>
                </div>
                <div className="py-1">
                  {isFarmer ? (
                    <>
                      <DropdownItem icon={<Home className="h-4 w-4" />} onClick={() => { router.push('/producer/dashboard'); setAccountOpen(false); }}>
                        {t('nav.home', language)}
                      </DropdownItem>
                      <DropdownItem icon={<Sprout className="h-4 w-4" />} onClick={() => { router.push('/producer/products'); setAccountOpen(false); }}>
                        {t('nav.products', language)}
                      </DropdownItem>
                      <DropdownItem icon={<User className="h-4 w-4" />} onClick={() => { router.push('/producer/profile'); setAccountOpen(false); }}>
                        {t('nav.profile', language)}
                      </DropdownItem>
                      <DropdownItem icon={<Settings className="h-4 w-4" />} onClick={() => { router.push('/producer/settings'); setAccountOpen(false); }}>
                        {t('nav.settings', language)}
                      </DropdownItem>
                    </>
                  ) : isDelivery ? (
                    <>
                      <DropdownItem icon={<Home className="h-4 w-4" />} onClick={() => { router.push('/delivery/dashboard'); setAccountOpen(false); }}>
                        {t('nav.home', language)}
                      </DropdownItem>
                      <DropdownItem icon={<User className="h-4 w-4" />} onClick={() => { router.push('/account'); setAccountOpen(false); }}>
                        {t('nav.profile', language)}
                      </DropdownItem>
                      <DropdownItem icon={<Settings className="h-4 w-4" />} onClick={() => { router.push('/account/settings'); setAccountOpen(false); }}>
                        {t('nav.settings', language)}
                      </DropdownItem>
                    </>
                  ) : (
                    <>
                      <DropdownItem icon={<Home className="h-4 w-4" />} onClick={() => { router.push('/'); setAccountOpen(false); }}>
                        {t('nav.home', language)}
                      </DropdownItem>
                      <DropdownItem icon={<User className="h-4 w-4" />} onClick={() => { router.push('/account'); setAccountOpen(false); }}>
                        {t('nav.profile', language)}
                      </DropdownItem>
                      <DropdownItem icon={<Package className="h-4 w-4" />} onClick={() => { router.push('/orders'); setAccountOpen(false); }}>
                        {t('nav.myOrders', language)}
                      </DropdownItem>
                      <DropdownItem icon={<Settings className="h-4 w-4" />} onClick={() => { router.push('/account/settings'); setAccountOpen(false); }}>
                        {t('nav.settings', language)}
                      </DropdownItem>
                      {isConsumer && (
                        <DropdownItem icon={<MapPin className="h-4 w-4" />} onClick={() => { router.push('/account/addresses'); setAccountOpen(false); }}>
                          {t('nav.addresses', language)}
                        </DropdownItem>
                      )}
                    </>
                  )}
                  <div className="border-t border-charcoal-100 pt-1">
                    <DropdownItem icon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
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
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-charcoal-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
    >
      {icon && <span className="text-charcoal-400">{icon}</span>}
      {children}
    </button>
  );
}
