'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Save, Navigation } from 'lucide-react';
import { useState } from 'react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore, useUIStore } from '@/store';
import { t } from '@/i18n';
import { toast } from 'sonner';

export default function FarmerAddressPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const language = useUIStore((state) => state.language);

  const [address, setAddress] = useState({
    label: 'Farm / FPO',
    addressLine1: '',
    city: '',
    district: '',
    state: 'Tamil Nadu',
    pincode: '',
  });
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      toast.success('Farm address updated successfully');
      setSaving(false);
    }, 500);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          toast.success('Location detected');
        },
        () => {
          toast.error('Location permission denied. Please enter your address manually.');
        }
      );
    }
  };

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/producer/settings" className="rounded-lg p-2 hover:bg-charcoal-100">
            <ArrowLeft className="h-5 w-5 text-charcoal-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-charcoal-800">Farm / FPO Address</h1>
            <p className="text-sm text-charcoal-500">Set your farm pickup location</p>
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

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-charcoal-800">Farm / FPO Address</h2>
          </div>
          <div className="space-y-3">
            <Input
              label="Label"
              value={address.label}
              onChange={(e) => setAddress({ ...address, label: e.target.value })}
            />
            <Input
              label="Address line 1"
              value={address.addressLine1}
              onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              <Input label="District" value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
              <Input label="Pincode" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} inputMode="numeric" />
            </div>
          </div>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.push('/producer/settings')}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Save Address
          </Button>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
