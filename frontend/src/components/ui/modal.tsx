'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideCloseButton?: boolean;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  hideCloseButton = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-charcoal-950/50 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className={cn(
          'w-full rounded-2xl bg-white shadow-2xl animate-slide-up',
          sizeClasses[size]
        )}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between border-b border-charcoal-100 px-5 py-4">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-charcoal-800">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-sm text-charcoal-500">{subtitle}</p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-charcoal-400 transition-colors hover:bg-charcoal-100 hover:text-charcoal-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-charcoal-100 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}