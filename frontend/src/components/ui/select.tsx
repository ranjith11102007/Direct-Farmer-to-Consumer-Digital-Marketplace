import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  icon?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, icon, id, ...props }, ref) => {
    const selectId = id ?? props.name ?? 'select';
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
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
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none rounded-lg border bg-white py-2.5 text-sm text-charcoal-900 shadow-sm',
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
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
        </div>
        {hint && !error && <p className="mt-1 text-xs text-charcoal-500">{hint}</p>}
        {error && (
          <p className="mt-1 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };