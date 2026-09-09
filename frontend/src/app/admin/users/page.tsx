'use client';

import { useState } from 'react';
import { Users, Search, ShieldCheck, ShieldX, UserX, MoreHorizontal } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { VerificationQueue } from '@/components/admin/verification-queue';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatDate, getInitials } from '@/lib/utils';
import type { User, UserRole, UserStatus } from '@/types';

const ROLES: Array<{ key: UserRole | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'consumer', label: 'Consumers' },
  { key: 'farmer', label: 'Farmers' },
  { key: 'fpo', label: 'FPOs' },
  { key: 'bulk_buyer', label: 'Bulk Buyers' },
  { key: 'delivery_partner', label: 'Delivery' },
  { key: 'admin', label: 'Admins' },
];

const STATUS_VARIANT: Record<UserStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
  suspended: 'danger',
  active: 'success',
};

const MOCK_USERS: Array<User & { kycType?: string; submittedAt?: string; id: string }> = [
  ...([
    {
      id: 'u1',
      name: 'Kasirajan Murugan',
      phoneNumber: '9962987345',
      role: 'farmer' as UserRole,
      status: 'pending' as UserStatus,
      language: 'ta' as const,
      kycStatus: 'submitted',
      kycType: 'Aadhaar',
      submittedAt: '2026-09-08T09:12:00.000Z',
      registeredAt: '2026-09-05T00:00:00.000Z',
      address: { id: 'a', label: 'farm', addressLine1: 'Thiruvannamalai', city: 'Thiruvannamalai', district: 'Tiruvannamalai', state: 'TN', pincode: '606601' },
    },
    {
      id: 'u2',
      name: 'Priya Nandhini',
      phoneNumber: '9097644332',
      role: 'consumer' as UserRole,
      status: 'active' as UserStatus,
      language: 'en' as const,
      registeredAt: '2026-07-21T00:00:00.000Z',
      address: { id: 'a', label: 'home', addressLine1: '12 Lake View Colony', city: 'Chennai', district: 'Chengalpattu', state: 'TN', pincode: '600100' },
    },
    {
      id: 'u3',
      name: 'Vijay Anand',
      phoneNumber: '9842356189',
      role: 'delivery_partner' as UserRole,
      status: 'pending' as UserStatus,
      language: 'ta' as const,
      kycStatus: 'submitted',
      kycType: 'Driving Licence',
      submittedAt: '2026-09-09T06:05:00.000Z',
      registeredAt: '2026-09-06T00:00:00.000Z',
    },
  ] as unknown as User[]).map((u) => ({ ...u, id: u.id })),
];

export default function AdminUsersPage() {
  const language = useUIStore((state) => state.language);
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = MOCK_USERS.filter(
    (u) =>
      (role === 'all' || u.role === role) &&
      (query === '' || u.name.toLowerCase().includes(query.toLowerCase()) || u.phoneNumber.includes(query))
  );

  const pendingQueue = MOCK_USERS.filter((u) => u.status === 'pending');

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-charcoal-800">{t('admin.users', language)}</h1>
          <p className="mt-1 text-sm text-charcoal-500">{t('admin.manageUsers', language)}</p>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            onDebouncedChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder={t('admin.searchUsers', language)}
            delay={300}
            className="sm:w-72"
          />
          <div className="flex flex-wrap gap-1">
            {ROLES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setRole(key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  role === key ? 'bg-primary-600 text-white' : 'bg-charcoal-100 text-charcoal-600 hover:bg-charcoal-200'
                )}
              >
                {t(`admin.role_${key === 'all' ? 'all' : key}`, language) === `admin.role_${key === 'all' ? 'all' : key}` ? label : t(`admin.role_${key}`, language)}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-charcoal-400">{filtered.length} {t('admin.users', language)}</span>
        </div>

        {pendingQueue.length > 0 && (
          <Card className="mb-6">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-charcoal-800">
              <ShieldCheck className="h-4 w-4 text-primary-600" /> {t('admin.verificationQueue', language)}
            </h2>
            <VerificationQueue items={pendingQueue} />
          </Card>
        )}

        <Card>
          <div className="divide-y divide-charcoal-100">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <Users className="h-7 w-7 text-charcoal-300" />
                <p className="text-sm text-charcoal-400">{t('admin.noUsers', language)}</p>
              </div>
            ) : (
              filtered.map((user) => (
                <div key={user.id} className="flex flex-wrap items-center gap-3 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">
                    {getInitials(user.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-charcoal-800">
                      {user.name}
                      <Badge variant={STATUS_VARIANT[user.status]}>
                        {t(`admin.userStatus_${user.status}`, language) === `admin.userStatus_${user.status}` ? user.status : t(`admin.userStatus_${user.status}`, language)}
                      </Badge>
                    </p>
                    <p className="mt-0.5 text-xs text-charcoal-500">
                      {user.phoneNumber} • {user.role}
                      {user.address && <> • {user.address.city}, {user.address.state}</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {user.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="!bg-green-600 hover:!bg-green-700"
                          onClick={() => toastSuccess()}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> {t('admin.verify', language)}
                        </Button>
                        <Button size="sm" variant="outline" className="!border-red-200 !text-red-500 hover:!bg-red-50" onClick={() => toastError()}>
                          <ShieldX className="h-3.5 w-3.5" /> {t('common.reject', language)}
                        </Button>
                      </>
                    )}
                    {user.status === 'active' && (
                      <Button size="sm" variant="ghost" onClick={() => toastInfo()}>
                        <UserX className="h-3.5 w-3.5" /> {t('admin.suspend', language)}
                      </Button>
                    )}
                    <button className="rounded-lg p-1.5 text-charcoal-400 hover:bg-charcoal-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="mt-6 flex justify-center">
          <Pagination page={page} totalPages={3} onPageChange={setPage} />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

function toastSuccess() {
  const { toast } = require('sonner') as typeof import('sonner');
  toast.success('User verified');
}
function toastError() {
  const { toast } = require('sonner') as typeof import('sonner');
  toast.error('User rejected');
}
function toastInfo() {
  const { toast } = require('sonner') as typeof import('sonner');
  toast.info('Account suspended');
}