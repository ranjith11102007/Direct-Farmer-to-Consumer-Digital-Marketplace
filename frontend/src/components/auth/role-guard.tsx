'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { PageLoader } from '@/components/ui/loading';

const DASHBOARD_BY_ROLE: Record<string, string> = {
  farmer: '/producer/dashboard',
  fpo: '/producer/dashboard',
  fpo_admin: '/producer/dashboard',
  delivery_partner: '/delivery/dashboard',
  bulk_buyer: '/bulk',
  admin: '/admin/dashboard',
  consumer: '/',
};

export interface RoleGuardProps {
  roles?: string[];
  redirectTo?: string;
  children: React.ReactNode;
}

export function RoleGuard({ roles, redirectTo, children }: RoleGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;
    setChecked(true);

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (roles && roles.length > 0 && !roles.includes(user.role)) {
      router.replace(redirectTo ?? DASHBOARD_BY_ROLE[user.role] ?? '/');
      return;
    }
  }, [isAuthenticated, user, roles, redirectTo, router, checked]);

  const allowed = roles && roles.length > 0 ? roles.includes(user?.role ?? '') : true;
  if (!checked || !isAuthenticated || !user || !allowed) {
    return <PageLoader text="Checking access..." />;
  }

  return <>{children}</>;
}