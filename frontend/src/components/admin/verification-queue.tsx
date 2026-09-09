'use client';

import { Check, X, UserCheck, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatDate, getInitials } from '@/lib/utils';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import type { User } from '@/types';

export interface VerificationQueueProps {
  items: Array<User & { kycType?: string; submittedAt?: string }>;
  onVerify?: (userId: string) => void;
  onReject?: (userId: string) => void;
  onView?: (userId: string) => void;
  isLoading?: boolean;
}

export function VerificationQueue({ items, onVerify, onReject, onView, isLoading = false }: VerificationQueueProps) {
  const language = useUIStore((state) => state.language);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-xl border border-charcoal-100 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-charcoal-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-charcoal-100" />
                <div className="h-3 w-1/2 rounded bg-charcoal-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-charcoal-200 py-10 text-center">
        <UserCheck className="h-6 w-6 text-charcoal-300" />
        <p className="text-sm text-charcoal-400">{t('admin.userQueueEmpty', language) === 'admin.userQueueEmpty' ? 'Queue is empty' : 'Queue is empty'}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-charcoal-100">
      {items.map((user) => (
        <div key={user.id} className="flex items-center gap-3 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">
            {getInitials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-charcoal-800">{user.name}</p>
              <Badge variant="primary">{user.role}</Badge>
              {user.kycType && <Badge variant="neutral">{user.kycType}</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-charcoal-500">
              {user.phoneNumber}
              {user.submittedAt && (
                <>
                  <span className="mx-1">•</span>
                  {formatDate(user.submittedAt)}
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={() => onView?.(user.id)}
              className="rounded-lg border border-charcoal-200 p-1.5 text-charcoal-500 transition-colors hover:border-primary-300 hover:text-primary-700"
              aria-label={`${t('admin.reviewProduct', language)} - ${user.name}`}
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              onClick={() => onReject?.(user.id)}
              className="rounded-lg border border-red-200 p-1.5 text-red-500 transition-colors hover:bg-red-50"
              aria-label={`${t('common.reject', language)} - ${user.name}`}
            >
              <X className="h-4 w-4" />
            </button>
            <Button size="sm" onClick={() => onVerify?.(user.id)}>
              <Check className="h-4 w-4" />
              {t('admin.verify', language)}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}