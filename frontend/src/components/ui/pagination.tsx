'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showPageNumbers?: boolean;
}

function getPageItems(page: number, totalPages: number, siblingCount: number): Array<number | '...'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const left = Math.max(1, page - siblingCount);
  const right = Math.min(totalPages, page + siblingCount);
  const shouldShowLeftDots = left > 2;
  const shouldShowRightDots = right < totalPages - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const start = Array.from({ length: 3 + 2 * siblingCount }, (_, i) => i + 1);
    return [...start, '...', totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const end = Array.from(
      { length: 3 + 2 * siblingCount },
      (_, i) => totalPages - (3 + 2 * siblingCount) + 1 + i
    );
    return [1, '...', ...end];
  }

  return [1, '...', ...Array.from({ length: right - left + 1 }, (_, i) => left + i), '...', totalPages];
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showPageNumbers = true,
}: PaginationProps) {
  const pages = useMemo(
    () => getPageItems(page, totalPages, siblingCount),
    [page, totalPages, siblingCount]
  );

  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-charcoal-600 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40 disabled:pointer-events-none"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {showPageNumbers &&
        pages.map((item, index) =>
          item === '...' ? (
            <span
              key={`dots-${index}`}
              className="flex h-9 w-9 items-center justify-center text-sm text-charcoal-400"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={cn(
                'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors',
                item === page
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-charcoal-600 hover:bg-primary-50 hover:text-primary-700'
              )}
            >
              {item}
            </button>
          )
        )}

      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-charcoal-600 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40 disabled:pointer-events-none"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}