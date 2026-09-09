import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  hint?: string;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, hint, containerClassName, id, ...props }, ref) => {
    const inputId = id ?? props.name ?? 'input';
    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-charcoal-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-charcoal-900 shadow-sm',
              'placeholder:text-charcoal-400',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-10',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-charcoal-200',
              className
            )}
            aria-invalid={Boolean(error)}
            {...props}
          />
        </div>
        {hint && !error && (
          <p className="mt-1 text-xs text-charcoal-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };