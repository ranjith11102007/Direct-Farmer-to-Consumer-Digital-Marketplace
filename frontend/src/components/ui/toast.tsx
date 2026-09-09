'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { useUIStore } from '@/store';

export function ToastProvider() {
  const language = useUIStore((state) => state.language);

  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      expand
      toastOptions={{
        style: {
          borderRadius: '12px',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          fontFamily: language === 'ta' ? 'Noto Sans Tamil, sans-serif' : 'Inter, sans-serif',
        },
      }}
    />
  );
}