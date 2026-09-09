'use client';

import { useMemo, useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RatingProps {
  rating?: number;
  max?: number;
  count?: number;
  readonly?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onChange?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const gapClasses = {
  xs: 'gap-0.5',
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1',
};

export function Rating({
  rating = 0,
  max = 5,
  count,
  readonly = true,
  size = 'sm',
  onChange,
  showValue = false,
  className,
}: RatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const clampedRating = Math.max(0, Math.min(rating, max));
  const effectiveRating = hovered ?? clampedRating;

  const stars = useMemo(() => Array.from({ length: max }, (_, i) => i + 1), [max]);

  const handleClick = (value: number) => {
    if (readonly) return;
    onChange?.(value === clampedRating ? value - 1 : value);
  };

  return (
    <div
      className={cn('inline-flex items-center', gapClasses[size], className)}
      role="img"
      aria-label={`${clampedRating.toFixed(1)} out of ${max} stars`}
      onMouseLeave={() => setHovered(null)}
    >
      {stars.map((star) => {
        const filled = effectiveRating >= star;
        const hasHalf = !filled && effectiveRating >= star - 0.5;

        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            className={cn(
              !readonly && 'cursor-pointer transition-transform hover:scale-110',
              readonly && 'cursor-default'
            )}
            aria-hidden={readonly}
            tabIndex={readonly ? -1 : 0}
          >
            {hasHalf ? (
              <StarHalf
                className={cn(sizeClasses[size], 'fill-primary-500 text-primary-500')}
              />
            ) : (
              <Star
                className={cn(
                  sizeClasses[size],
                  filled
                    ? 'fill-primary-500 text-primary-500'
                    : 'fill-charcoal-100 text-charcoal-200'
                )}
              />
            )}
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-xs font-medium text-charcoal-600 tabular-nums">
          {clampedRating.toFixed(1)}
        </span>
      )}
      {count !== undefined && count > 0 && (
        <span className="ml-1 text-xs text-charcoal-400">({count})</span>
      )}
    </div>
  );
}