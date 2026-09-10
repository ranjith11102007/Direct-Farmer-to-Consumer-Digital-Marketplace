'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';

const DASHBOARDS: Record<string, string> = {
  farmer: '/producer/dashboard',
  fpo: '/producer/dashboard',
  fpo_admin: '/producer/dashboard',
  delivery_partner: '/delivery/dashboard',
  bulk_buyer: '/bulk',
  admin: '/admin/dashboard',
};

export function LandingRedirect() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const redirected = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || redirected.current) return;
    const target = user ? DASHBOARDS[user.role] : undefined;
    if (target) {
      redirected.current = true;
      router.replace(target);
    }
  }, [isAuthenticated, user, router]);

  return null;
}