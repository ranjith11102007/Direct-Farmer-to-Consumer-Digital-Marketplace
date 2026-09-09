'use client';

import { useCallback, useId } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 text-sm',
  md: 'h-10 text-sm',
  lg: 'h-12 text-base',
};

const buttonClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
};

const iconClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function QuantitySelector({
  quantity,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  size = 'md',
  disabled = false,
  className,
}: QuantitySelectorProps) {
  const inputId = useId();

  const clamp = useCallback(
    (value: number) => Math.min(Math.max(value, min), max),
    [min, max]
  );

  const handleDecrement = () => {
    if (disabled) return;
    onChange(clamp(quantity - step));
  };

  const handleIncrement = () => {
    if (disabled) return;
    onChange(clamp(quantity + step));
  };

  const handleInputChange = (value: string) => {
    if (disabled) return;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      onChange(min);
      return;
    }
    onChange(clamp(parsed));
  };

  return (
    <div
      className={cn(
        'inline-flex items-center overflow-hidden rounded-lg border border-charcoal-200 bg-white',
        sizeClasses[size],
        disabled && 'opacity-50',
        className
      )}
      role="group"
      aria-label="Quantity selector"
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || quantity <= min}
        className={cn(
          'flex items-center justify-center text-charcoal-600 transition-colors hover:text-primary-700',
          'disabled:opacity-40 disabled:pointer-events-none',
          buttonClasses[size]
        )}
        aria-label="Decrease quantity"
      >
        <Minus className={iconClasses[size]} />
      </button>
      <input
        id={inputId}
        type="number"
        value={quantity}
        min={min}
        max={max}
        step={step}
        onChange={(e) => handleInputChange(e.target.value)}
        disabled={disabled}
        inputMode="numeric"
        className={cn(
          'w-12 border-0 border-x border-charcoal-100 bg-transparent text-center font-medium text-charcoal-800',
          'focus:outline-none focus:ring-0 focus:border-primary-300',
          'appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
        )}
        aria-label="Current quantity"
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || quantity >= max}
        className={cn(
          'flex items-center justify-center text-charcoal-600 transition-colors hover:text-primary-700',
          'disabled:opacity-40 disabled:pointer-events-none',
          buttonClasses[size]
        )}
        aria-label="Increase quantity"
      >
        <Plus className={iconClasses[size]} />
      </button>
    </div>
  );
}