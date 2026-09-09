'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/i18n';
import { useLocation } from '@/hooks/useLocation';
import { useUIStore } from '@/store';
import { CheckCircle2, Loader2, LocateFixed, MapPin, Plus, Search, XCircle } from 'lucide-react';
import { isValidPincode, cn } from '@/lib/utils';

export interface LocationSelectorProps {
  open: boolean;
  onClose: () => void;
}

const LABEL_ICONS: Record<string, string> = { home: '🏠', work: '🏢', other: '📍' };

export function LocationSelector({ open, onClose }: LocationSelectorProps) {
  const language = useUIStore((state) => state.language);
  const {
    savedAddresses,
    isLocating,
    serviceArea,
    locationError,
    handleUseCurrentLocation,
    checkServiceAvailability,
    selectAddress,
    saveAddress,
  } = useLocation();

  const [pincode, setPincode] = useState('');
  const [checking, setChecking] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState({
    label: 'home',
    addressLine1: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
  });

  const pincodeValid = isValidPincode(pincode);
  const formValid = isValidPincode(form.pincode) && form.addressLine1.trim().length > 0;

  const handleCheck = async () => {
    if (!pincodeValid) return;
    setChecking(true);
    await checkServiceAvailability(pincode);
    setChecking(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;
    saveAddress({
      id: `manual-${Date.now()}`,
      label: form.label || 'home',
      addressLine1: form.addressLine1,
      city: form.city,
      district: form.district,
      state: form.state,
      pincode: form.pincode,
    });
    setShowManual(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('location.deliverTo', language)}
      subtitle={t('location.enterPincode', language)}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('location.pincode', language)}
            inputMode="numeric"
            icon={<Search className="h-4 w-4" />}
            aria-label={t('location.pincode', language)}
          />
          <Button onClick={handleCheck} disabled={!pincodeValid || checking} loading={checking}>
            {t('common.check', language)}
          </Button>
        </div>

        {serviceArea && (
          <div className={cn('flex items-center gap-2 rounded-xl border px-4 py-3', 'border-green-200 bg-green-50')}>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">{t('location.serviceAvailable', language)}</p>
              <p className="text-xs text-green-600">
                {t('location.deliveryFee', language) === 'location.deliveryFee'
                  ? ''
                  : t('location.deliveryFee', language)}
              </p>
            </div>
          </div>
        )}
        {pincode && pincodeValid && !serviceArea && !checking && (
          <div className={cn('flex items-center gap-2 rounded-xl border px-4 py-3', 'border-accent-200 bg-accent-50')}>
            <XCircle className="h-5 w-5 text-accent-600" />
            <p className="text-sm font-medium text-accent-800">{t('location.serviceUnavailable', language)}</p>
          </div>
        )}

        <button
          onClick={async () => {
            const addr = await handleUseCurrentLocation();
            if (addr) {
              onClose();
            }
          }}
          className="flex w-full items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-left transition-colors hover:border-primary-400"
          disabled={isLocating}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            {isLocating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-primary-800">{t('location.useCurrentLocation', language)}</p>
            <p className="text-xs text-primary-600">
              {isLocating ? t('location.detecting', language) : t('location.detecting', language)}
            </p>
          </div>
        </button>

        {locationError && <p className="text-xs text-accent-600">{locationError}</p>}

        <button
          onClick={() => setShowManual((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl border border-charcoal-200 px-4 py-3 text-left transition-colors hover:border-primary-300"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-100 text-charcoal-500">
            <Plus className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-charcoal-800">{t('location.addNewAddress', language)}</p>
        </button>

        {showManual && (
          <form onSubmit={handleFormSubmit} className="space-y-3 rounded-xl border border-charcoal-200 p-4">
            <div className="flex gap-2">
              {['home', 'work', 'other'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setForm({ ...form, label })}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    form.label === label
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-charcoal-200 text-charcoal-500 hover:border-charcoal-300'
                  )}
                >
                  {LABEL_ICONS[label]} {t(`location.${label}`, language)}
                </button>
              ))}
            </div>
            <Input
              label={t('location.addressLine1', language)}
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                label={t('location.city', language)}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                label={t('location.district', language)}
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                label={t('location.state', language)}
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
              <Input
                label={t('location.pincode', language)}
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                inputMode="numeric"
              />
            </div>
            <Button type="submit" fullWidth disabled={!formValid}>
              {t('location.saveAddress', language)}
            </Button>
          </form>
        )}

        {savedAddresses.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-charcoal-700">{t('location.savedAddresses', language)}</h4>
            <div className="space-y-2">
              {savedAddresses.map((address) => (
                <button
                  key={address.id}
                  onClick={() => {
                    selectAddress(address);
                    onClose();
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    'border-charcoal-200 hover:border-primary-300 hover:bg-primary-50'
                  )}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-charcoal-800">
                      {LABEL_ICONS[address.label] ?? '📍'} {address.label}
                    </p>
                    <p className="text-xs text-charcoal-500">
                      {address.addressLine1}, {address.city} {address.pincode}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}