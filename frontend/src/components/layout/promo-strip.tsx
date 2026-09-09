'use client';

import { useEffect, useState } from 'react';
import { Sprout, X } from 'lucide-react';
import Link from 'next/link';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';

export function PromoStrip() {
  const [visible, setVisible] = useState(true);
  const language = useUIStore((state) => state.language);

  useEffect(() => {
    const dismissed = localStorage.getItem('vaikkal-promo-dismissed');
    if (dismissed) {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('vaikkal-promo-dismissed', '1');
  };

  return (
    <div className="relative bg-gradient-to-r from-primary-800 via-primary-700 to-primary-800 px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 pr-8 text-center">
        <Sprout className="h-4 w-4 shrink-0 text-secondary-300" aria-hidden="true" />
        <p className="text-xs font-medium text-secondary-100 sm:text-sm">
          {t('promo.strip', language)}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-secondary-200 transition-colors hover:bg-primary-700 hover:text-white"
        aria-label={t('common.close', language)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}