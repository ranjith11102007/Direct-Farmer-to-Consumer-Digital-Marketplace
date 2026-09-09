import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  paddingless?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, paddingless = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-charcoal-200/70 bg-white shadow-sm',
          hoverable &&
            'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md',
          !paddingless && 'p-4 sm:p-5',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mb-4 flex items-start justify-between gap-3', className)}
        {...props}
      >
        <div>
          {title && (
            <h3 className="text-base font-semibold text-charcoal-800">{title}</h3>
          )}
          {subtitle && <p className="mt-0.5 text-sm text-charcoal-500">{subtitle}</p>}
        </div>
        {action}
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export { Card, CardHeader };