'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Camera, MapPin, Phone, Mail, Building, FileText } from 'lucide-react';
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
import { getInitials } from '@/lib/utils';

export default function FarmerProfilePage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const language = useUIStore((state) => state.language);

  const [form, setForm] = useState({
    name: user?.name ?? '',
    farmName: '',
    phoneNumber: user?.phoneNumber ?? '',
    email: user?.email ?? '',
    farmAddress: '',
    location: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = { ...user, ...form } as typeof user;
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PromoStrip />
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/producer/dashboard" className="rounded-lg p-2 hover:bg-charcoal-100">
            <ArrowLeft className="h-5 w-5 text-charcoal-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-charcoal-800">Edit Profile</h1>
            <p className="text-sm text-charcoal-500">Manage your farm profile information</p>
          </div>
        </div>

        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-2xl font-bold text-white">
              {getInitials(form.name || 'F')}
            </span>
            <div>
              <p className="text-lg font-semibold text-charcoal-800">{form.name}</p>
              <p className="text-sm text-charcoal-500">{form.farmName}</p>
              <Button variant="outline" size="sm" className="mt-2">
                <Camera className="h-3.5 w-3.5 mr-1" /> Change Photo
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-charcoal-800">Personal Information</h2>
            <div className="space-y-3">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                icon={<FileText className="h-4 w-4" />}
              />
              <Input
                label="Farm / FPO Name"
                value={form.farmName}
                onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                icon={<Building className="h-4 w-4" />}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Phone Number"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  icon={<Phone className="h-4 w-4" />}
                />
                <Input
                  label="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  icon={<Mail className="h-4 w-4" />}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-charcoal-800">Farm / FPO Address</h2>
            <div className="space-y-3">
              <Input
                label="Farm / FPO Address"
                value={form.farmAddress}
                onChange={(e) => setForm({ ...form, farmAddress: e.target.value })}
                icon={<MapPin className="h-4 w-4" />}
              />
              <Input
                label="Location / District"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-charcoal-800">About</h2>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Describe your farming practices, specialties, and certifications..."
              className="w-full rounded-lg border border-charcoal-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </Card>

          <div className="flex justify-end gap-3 border-t border-charcoal-100 pt-4">
            <Button variant="outline" onClick={() => router.push('/producer/dashboard')}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" /> Save Changes
            </Button>
          </div>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
