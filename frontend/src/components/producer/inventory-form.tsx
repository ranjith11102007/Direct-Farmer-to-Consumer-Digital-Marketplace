'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { toast } from 'sonner';
import { SprayCan, Leaf, Package } from 'lucide-react';
import type { Product, ProductCategory } from '@/types';

export interface InventoryFormProps {
  initialData?: Partial<Product>;
  onSubmit?: (data: Partial<Product>) => Promise<void> | void;
}

const CATEGORY_OPTIONS = [
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'grains', label: 'Grains and Millets' },
  { value: 'pulses', label: 'Pulses and Lentils' },
  { value: 'spices', label: 'Spices' },
  { value: 'oilseeds', label: 'Oilseeds' },
  { value: 'dairy', label: 'Dairy and Eggs' },
  { value: 'organic', label: 'Organic Products' },
  { value: 'processed', label: 'Processed Foods' },
  { value: 'seeds', label: 'Seeds and Farm Inputs' },
];

const UNIT_OPTIONS = ['kg', 'g', 'bundle', 'dozen', 'litre'].map((u) => ({ value: u, label: u }));
const GRADE_OPTIONS = ['Premium', 'A', 'B', 'Organic'].map((g) => ({ value: g, label: g }));

export function InventoryForm({ initialData, onSubmit }: InventoryFormProps) {
  const language = useUIStore((state) => state.language);
  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    nameTa: initialData?.nameTa ?? '',
    category: (initialData?.category ?? 'vegetables') as ProductCategory,
    unit: initialData?.unit ?? 'kg',
    currentPricePerUnit: initialData?.currentPricePerUnit ?? 0,
    availableQuantity: initialData?.availableQuantity ?? 0,
    minOrderQuantity: initialData?.minOrderQuantity ?? 1,
    grade: initialData?.grade ?? 'A',
    isOrganic: initialData?.isOrganic ?? false,
    harvestDate: initialData?.harvestDate ?? new Date().toISOString().slice(0, 10),
    shelfLifeDays: initialData?.shelfLifeDays ?? 5,
    description: initialData?.description ?? '',
    packagingType: initialData?.packagingType ?? 'loose',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('validation.required', language).replace('{{field}}', t('producer.productName', language)));
      return;
    }
    if (form.currentPricePerUnit <= 0) {
      toast.error(t('validation.invalidQuantity', language));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit?.(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-charcoal-200/70 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t('producer.productName', language)}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label={t('producer.productNameTa', language)}
          value={form.nameTa}
          onChange={(e) => setForm({ ...form, nameTa: e.target.value })}
          className="font-tamil"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label={t('producer.category', language)}
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
          options={CATEGORY_OPTIONS.map((option) => ({ value: option.value, label: t(`categories.${option.value}`, language) }))}
        />
        <Select
          label={t('producer.unit', language)}
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          options={UNIT_OPTIONS}
        />
        <Input
          label={`${t('producer.price', language)} (₹)`}
          type="number"
          min={0}
          step="0.5"
          value={form.currentPricePerUnit || ''}
          onChange={(e) => setForm({ ...form, currentPricePerUnit: Number(e.target.value) })}
          icon={<Package className="h-4 w-4" />}
        />
        <Input
          label={t('producer.quantity', language)}
          type="number"
          min={0}
          step="0.5"
          value={form.availableQuantity || ''}
          onChange={(e) => setForm({ ...form, availableQuantity: Number(e.target.value) })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label={t('producer.minOrder', language)}
          type="number"
          min={1}
          value={form.minOrderQuantity || ''}
          onChange={(e) => setForm({ ...form, minOrderQuantity: Number(e.target.value) })}
        />
        <Select
          label={t('producer.grade', language)}
          value={form.grade}
          onChange={(e) => setForm({ ...form, grade: e.target.value as Product['grade'] })}
          options={GRADE_OPTIONS}
        />
        <Input
          label={t('producer.harvestDate', language)}
          type="date"
          value={form.harvestDate}
          onChange={(e) => setForm({ ...form, harvestDate: e.target.value })}
        />
        <Input
          label={t('producer.shelfLife', language)}
          type="number"
          min={1}
          value={form.shelfLifeDays || ''}
          onChange={(e) => setForm({ ...form, shelfLifeDays: Number(e.target.value) })}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-charcoal-700">
          <input
            type="checkbox"
            checked={form.isOrganic}
            onChange={(e) => setForm({ ...form, isOrganic: e.target.checked })}
            className="h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="flex items-center gap-1"><Leaf className="h-3.5 w-3.5 text-primary-600" /> {t('producer.isOrganic', language)}</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-charcoal-700">
          <SprayCan className="h-3.5 w-3.5 text-charcoal-400" />
          <span>{t('products.packaging', language)}:</span>
          <select
            value={form.packagingType}
            onChange={(e) => setForm({ ...form, packagingType: e.target.value })}
            className="rounded-lg border border-charcoal-200 px-2 py-1 text-sm"
          >
            {[t('products.loose', language), t('products.bag500g', language), t('products.bag1kg', language), t('products.bundle', language)].map((packaging) => (
              <option key={packaging} value={packaging}>{packaging}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-charcoal-700">{t('producer.description', language)}</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          placeholder="Describe quality, taste, growing practices..."
          className="w-full rounded-lg border border-charcoal-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <div className="flex items-center justify-between border-t border-charcoal-100 pt-4">
        <p className="text-xs text-charcoal-500">
          {t('products.minOrder', language)}: {form.minOrderQuantity} {form.unit} • {formatCurrency(form.currentPricePerUnit)}/{form.unit}
        </p>
        <Button type="submit" loading={submitting}>
          {initialData?.id ? t('producer.productUpdated', language) : t('producer.saveProduct', language)}
        </Button>
      </div>
    </form>
  );
}