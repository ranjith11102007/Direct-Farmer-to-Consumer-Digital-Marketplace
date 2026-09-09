'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { useUIStore } from '@/store';
import { toast } from 'sonner';

export interface RequirementFormProps {
  onSubmit?: (data: Record<string, unknown>) => Promise<void> | void;
  initialData?: Partial<RequirementFormData>;
}

export interface RequirementFormData {
  productName: string;
  productCategory: string;
  quantity: number;
  unit: string;
  preferredGrade?: string;
  budgetPerUnit?: number;
  deliveryLocation: string;
  deliveryDeadline: string;
  quotationDeadline: string;
  recurring: boolean;
  frequency: string;
  description: string;
}

const CATEGORY_OPTIONS = [
  'vegetables', 'fruits', 'grains', 'pulses', 'spices', 'oilseeds', 'dairy', 'organic', 'processed'
].map((c) => ({ value: c, label: c }));

const UNIT_OPTIONS = ['kg', 'g', 'bundle', 'dozen', 'litre', 'ton'].map((u) => ({ value: u, label: u }));
const FREQUENCY_OPTIONS = ['daily', 'weekly', 'monthly'].map((f) => ({ value: f, label: f }));

export function RequirementForm({ onSubmit, initialData }: RequirementFormProps) {
  const language = useUIStore((state) => state.language);
  const [form, setForm] = useState({
    productName: initialData?.productName ?? '',
    productCategory: initialData?.productCategory ?? 'vegetables',
    quantity: initialData?.quantity ?? 100,
    unit: initialData?.unit ?? 'kg',
    preferredGrade: initialData?.preferredGrade ?? 'A',
    budgetPerUnit: initialData?.budgetPerUnit ?? 0,
    deliveryLocation: initialData?.deliveryLocation ?? '',
    deliveryDeadline: initialData?.deliveryDeadline ?? '',
    quotationDeadline: initialData?.quotationDeadline ?? '',
    recurring: initialData?.recurring ?? false,
    frequency: initialData?.frequency ?? 'weekly',
    description: initialData?.description ?? '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName.trim() || form.quantity <= 0 || !form.deliveryDeadline) {
      toast.error(t('validation.requiredField', language));
      return;
    }
    if (form.budgetPerUnit && form.budgetPerUnit <= 0) {
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
          label={t('bulk.productName', language)}
          value={form.productName}
          onChange={(e) => setForm({ ...form, productName: e.target.value })}
          required
        />
        <Select
          label={t('bulk.productCategory', language)}
          value={form.productCategory}
          onChange={(e) => setForm({ ...form, productCategory: e.target.value })}
          options={CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: t(`categories.${opt.value}`, language) }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label={t('bulk.quantity', language)}
          type="number"
          min={1}
          step="0.5"
          value={form.quantity || ''}
          onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
        />
        <Select
          label={t('bulk.unit', language)}
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          options={UNIT_OPTIONS}
        />
        <Select
          label={t('bulk.preferredGrade', language)}
          value={form.preferredGrade ?? ''}
          onChange={(e) => setForm({ ...form, preferredGrade: e.target.value })}
          options={['Premium', 'A', 'B', 'Organic'].map((g) => ({ value: g, label: g }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={`${t('bulk.budgetPerUnit', language)} (₹)`}
          type="number"
          min={0}
          step="0.5"
          value={form.budgetPerUnit || ''}
          onChange={(e) => setForm({ ...form, budgetPerUnit: Number(e.target.value) })}
        />
        <Input
          label={t('bulk.deliveryLocation', language)}
          value={form.deliveryLocation}
          onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })}
          placeholder={t('location.city', language)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t('bulk.deliveryDeadline', language)}
          type="date"
          value={form.deliveryDeadline}
          onChange={(e) => setForm({ ...form, deliveryDeadline: e.target.value })}
        />
        <Input
          label={t('bulk.quotationDeadline', language)}
          type="date"
          value={form.quotationDeadline}
          onChange={(e) => setForm({ ...form, quotationDeadline: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-charcoal-700">
          <input
            type="checkbox"
            checked={form.recurring}
            onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
            className="h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500"
          />
          {t('bulk.recurring', language)}
        </label>
        {form.recurring && (
          <div className="flex gap-2">
            {(FREQUENCY_OPTIONS).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, frequency: opt.value })}
                className={
                  form.frequency === opt.value
                    ? 'rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white'
                    : 'rounded-full border border-charcoal-200 px-3 py-1.5 text-xs text-charcoal-600 hover:border-primary-300'
                }
              >
                {t(`bulk.${opt.value}`, language)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-charcoal-700">{t('bulk.description', language)}</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          placeholder={t('bulk.quantityNote', language)}
          className="w-full rounded-lg border border-charcoal-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <Button type="submit" fullWidth loading={submitting}>
        {t('bulk.submitRequirement', language)}
      </Button>
    </form>
  );
}