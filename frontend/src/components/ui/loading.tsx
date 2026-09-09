'use client';

import { cn } from '@/lib/utils';

export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  return (
    <div
      className={cn('flex items-center justify-center', className)}
      role="status"
      aria-label="Loading"
    >
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-primary-200 border-t-primary-600',
          sizeClasses[size]
        )}
      />
    </div>
  );
}

export function LoadingOverlay({ label }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-[2px]">
      <Spinner />
      {label && <p className="text-sm text-charcoal-600">{label}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-charcoal-100', className)} />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-charcoal-200/70 bg-white p-4">
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-3 h-6 w-2/3" />
      <div className="mt-4 flex items-center justify-between gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function PageLoader({ text }: { text?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      {text && <p className="text-sm text-charcoal-500">{text}</p>}
    </div>
  );
}

export function LineSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function TableRowSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="w-full space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-3">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton key={colIndex} className={cn('h-6', colIndex === 0 ? 'w-1/3' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}