import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'organic'
  | 'premium';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-800 border-primary-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-accent-100 text-accent-700 border-accent-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  neutral: 'bg-charcoal-100 text-charcoal-700 border-charcoal-200',
  organic: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  premium: 'bg-amber-100 text-amber-800 border-amber-200',
};

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-0.5 text-xs gap-1.5',
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', icon, size = 'sm', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border font-medium capitalize',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {icon}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };