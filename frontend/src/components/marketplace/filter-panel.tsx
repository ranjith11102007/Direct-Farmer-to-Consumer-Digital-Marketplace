'use client';

import { useState } from 'react';
import { ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import type { ProductCategory } from '@/types';
import type { SelectOption } from '@/components/ui/select';

export interface ProductFilters {
  categories?: ProductCategory[];
  priceMin?: number;
  priceMax?: number;
  maxDistance?: number;
  producerType?: 'farmer' | 'fpo';
  organicOnly?: boolean;
  grades?: string[];
  harvestWithinDays?: number;
  deliveryWithin?: string;
  packaging?: string[];
}

export interface FilterPanelProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
  onClear: () => void;
  categories?: SelectOption[];
  className?: string;
}

interface SectionProps {
  title: string;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

function FilterSection({ title, open = true, onToggle, children }: SectionProps) {
  return (
    <div className="border-b border-charcoal-100 py-3 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-sm font-semibold text-charcoal-800"
        aria-expanded={open}
      >
        {title}
        <ChevronDown className={cn('h-4 w-4 text-charcoal-400 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <div className="mt-3 space-y-2.5">{children}</div>}
    </div>
  );
}

const DISTANCES = [0, 1, 5, 10, 25, 50];
const GRADES = ['Premium', 'A', 'B', 'Organic'];

export function FilterPanel({ filters, onChange, onClear, categories, className }: FilterPanelProps) {
  const language = useUIStore((state) => state.language);
  const [sections, setSections] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    distance: false,
    producer: false,
    organic: true,
    grade: false,
    harvest: false,
    delivery: false,
    packaging: false,
  });

  const toggleSection = (key: string) => {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  };

  const toggleCategory = (category: ProductCategory) => {
    const current = filters.categories ?? [];
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    onChange({ ...filters, categories: next });
  };

  const toggleGrade = (grade: string) => {
    const current = filters.grades ?? [];
    const next = current.includes(grade)
      ? current.filter((g) => g !== grade)
      : [...current, grade];
    onChange({ ...filters, grades: next });
  };

  const togglePackaging = (item: string) => {
    const current = filters.packaging ?? [];
    const next = current.includes(item)
      ? current.filter((p) => p !== item)
      : [...current, item];
    onChange({ ...filters, packaging: next });
  };

  const setPrice = (min: number, max: number) => {
    onChange({ ...filters, priceMin: min, priceMax: max });
  };

  const activeCount =
    (filters.categories?.length ?? 0) +
    (filters.grades?.length ?? 0) +
    (filters.organicOnly ? 1 : 0) +
    (filters.maxDistance !== undefined && filters.maxDistance > 0 ? 1 : 0) +
    (filters.harvestWithinDays ? 1 : 0) +
    (filters.packaging?.length ?? 0);

  return (
    <div className={cn('space-y-1', className)}>
      <FilterSection title={t('products.filters.category', language)} open={sections.category} onToggle={() => toggleSection('category')}>
        {(categories ?? []).map(({ value, label }) => (
          <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-700">
            <input
              type="checkbox"
              checked={filters.categories?.includes(value as ProductCategory) ?? false}
              onChange={() => toggleCategory(value as ProductCategory)}
              className="h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500"
            />
            {label}
          </label>
        ))}
      </FilterSection>

      <FilterSection title={t('products.filters.priceRange', language)} open={sections.price} onToggle={() => toggleSection('price')}>
        <div className="space-y-2">
          {[
            { min: 0, max: 50 },
            { min: 50, max: 100 },
            { min: 100, max: 250 },
            { min: 250, max: 500 },
            { min: 500, max: 1000 },
          ].map((range) => (
            <label key={`${range.min}-${range.max}`} className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-700">
              <input
                type="checkbox"
                checked={filters.priceMin === range.min && filters.priceMax === range.max}
                onChange={() => setPrice(range.min, range.max)}
                className="h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500"
              />
              {formatCurrency(range.min)} - {formatCurrency(range.max)}
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title={t('products.filters.distance', language)} open={sections.distance} onToggle={() => toggleSection('distance')}>
        <div className="flex flex-wrap gap-2">
          {DISTANCES.map((distance) => {
            const activeKey = distance === 0 ? 'allDistances' : `under${distance > 1 ? distance : 1}km`;
            return (
              <button
                key={distance}
                onClick={() => onChange({ ...filters, maxDistance: distance === 0 ? undefined : ((distance as number) * 1000) })}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  (filters.maxDistance === undefined && distance === 0) ||
                  (filters.maxDistance !== undefined && filters.maxDistance === distance * 1000)
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-charcoal-200 text-charcoal-500 hover:border-charcoal-300'
                )}
              >
                {t(`products.filters.${activeKey}`, language)}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title={t('products.filters.producer', language)} open={sections.producer} onToggle={() => toggleSection('producer')}>
        {(['farmer', 'fpo'] as const).map((type) => (
          <label key={type} className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-700">
            <input
              type="radio"
              name="producer-type"
              checked={filters.producerType === type}
              onChange={() => onChange({ ...filters, producerType: type })}
              className="h-4 w-4 border-charcoal-300 text-primary-600 focus:ring-primary-500"
            />
            {type === 'farmer' ? t('products.filters.individual', language) : t('products.filters.fpo', language)}
          </label>
        ))}
      </FilterSection>

      <FilterSection title={t('products.filters.organicOnly', language)} open={sections.organic} onToggle={() => toggleSection('organic')}>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-700">
          <input
            type="checkbox"
            checked={filters.organicOnly ?? false}
            onChange={(e) => onChange({ ...filters, organicOnly: e.target.checked })}
            className="h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500"
          />
          {t('products.filters.organicOnly', language)}
        </label>
      </FilterSection>

      <FilterSection title={t('products.filters.grade', language)} open={sections.grade} onToggle={() => toggleSection('grade')}>
        {GRADES.map((grade) => (
          <label key={grade} className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-700">
            <input
              type="checkbox"
              checked={filters.grades?.includes(grade) ?? false}
              onChange={() => toggleGrade(grade)}
              className="h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500"
            />
            {grade}
          </label>
        ))}
      </FilterSection>

      <FilterSection title={t('products.filters.harvestDate', language)} open={sections.harvest} onToggle={() => toggleSection('harvest')}>
        {[
          { value: 3, label: 'days3' },
          { value: 7, label: 'days7' },
          { value: 14, label: 'days14' },
        ].map(({ value, label }) => (
          <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-700">
            <input
              type="radio"
              name="harvest"
              checked={filters.harvestWithinDays === value}
              onChange={() => onChange({ ...filters, harvestWithinDays: value })}
              className="h-4 w-4 border-charcoal-300 text-primary-600 focus:ring-primary-500"
            />
            {t(`products.filters.${label}`, language)}
          </label>
        ))}
      </FilterSection>

      <FilterSection title={t('products.filters.deliverySlots', language)} open={sections.delivery} onToggle={() => toggleSection('delivery')}>
        {['tomorrow', 'within48'].map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-700">
            <input
              type="checkbox"
              checked={filters.deliveryWithin === key}
              onChange={() => onChange({ ...filters, deliveryWithin: key })}
              className="h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500"
            />
            {t(`products.filters.${key}`, language)}
          </label>
        ))}
      </FilterSection>

      <FilterSection title={t('products.filters.packagingType', language)} open={sections.packaging} onToggle={() => toggleSection('packaging')}>
        {[
          t('products.loose', language),
          t('products.bag1kg', language),
          t('products.bag500g', language),
          t('products.bundle', language),
        ].map((packaging) => (
          <label key={packaging} className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-700">
            <input
              type="checkbox"
              checked={filters.packaging?.includes(packaging) ?? false}
              onChange={() => togglePackaging(packaging)}
              className="h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500"
            />
            {packaging}
          </label>
        ))}
      </FilterSection>

      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent-300 py-2 text-sm font-medium text-accent-700 transition-colors hover:bg-accent-50"
        >
          <X className="h-4 w-4" />
          {t('products.filters.clearAll', language)}
        </button>
      )}
    </div>
  );
}