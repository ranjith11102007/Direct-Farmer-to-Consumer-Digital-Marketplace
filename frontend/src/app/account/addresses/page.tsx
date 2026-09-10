'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Plus, Trash2, Navigation, Home, Briefcase, Star } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore, useUIStore, useLocationStore } from '@/store';
import { t } from '@/i18n';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Address } from '@/types';

export default function CustomerAddressesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const language = useUIStore((state) => state.language);
  const { savedAddresses, addAddress, removeAddress, setDefaultAddress } = useLocationStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: 'home',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) return null;

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          toast.success('Location detected. Please fill in the remaining details.');
          setShowForm(true);
        },
        () => {
          toast.error('Location permission denied. Please enter your address manually.');
          setShowForm(true);
        }
      );
    }
  };

  const handleSaveAddress = () => {
    if (!form.addressLine1.trim()) {
      toast.error('Address line 1 is required');
      return;
    }
    setSaving(true);
    const newAddress: Address = {
      id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...form,
      isDefault: savedAddresses.length === 0,
    };
    addAddress(newAddress);
    setForm({ label: 'home', addressLine1: '', addressLine2: '', city: '', district: '', state: '', pincode: '' });
    setShowForm(false);
    setSaving(false);
    toast.success('Address saved');
  };

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/account" className="rounded-lg p-2 hover:bg-charcoal-100">
            <ArrowLeft className="h-5 w-5 text-charcoal-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-charcoal-800">Delivery Addresses</h1>
            <p className="text-sm text-charcoal-500">Manage your delivery addresses</p>
          </div>
        </div>

        <Card className="mb-4">
          <button
            onClick={handleUseCurrentLocation}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-primary-300 bg-primary-50 px-4 py-3 text-left text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
          >
            <Navigation className="h-5 w-5" />
            Use current location
          </button>
        </Card>

        {savedAddresses.length > 0 && (
          <div className="space-y-3 mb-4">
            {savedAddresses.map((addr) => (
              <Card key={addr.id} className={cn('relative', addr.isDefault && 'border-primary-300 bg-primary-50/30')}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                      {addr.label === 'home' ? <Home className="h-4 w-4" /> : addr.label === 'work' ? <Briefcase className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-charcoal-800 capitalize">{addr.label}</p>
                      <p className="text-xs text-charcoal-500">{addr.addressLine1}</p>
                      <p className="text-xs text-charcoal-500">{[addr.city, addr.district, addr.state, addr.pincode].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!addr.isDefault && (
                      <button
                        onClick={() => setDefaultAddress(addr.id)}
                        className="text-xs font-medium text-primary-700 hover:underline"
                      >
                        Set default
                      </button>
                    )}
                    {addr.isDefault && (
                      <span className="flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                        <Star className="h-3 w-3 fill-current" /> Default
                      </span>
                    )}
                    <button
                      onClick={() => removeAddress(addr.id)}
                      className="rounded-lg p-1 text-charcoal-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {showForm ? (
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-charcoal-800">Add New Address</h2>
            <div className="space-y-3">
              <Input
                label="Label (home, work, other)"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
              <Input
                label="Address line 1"
                value={form.addressLine1}
                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
              />
              <Input
                label="Address line 2 (optional)"
                value={form.addressLine2}
                onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <Input label="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} inputMode="numeric" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button loading={saving} onClick={handleSaveAddress}>
                  <Save className="h-4 w-4 mr-1" /> Save Address
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add New Address
          </Button>
        )}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

function Save({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2 2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
