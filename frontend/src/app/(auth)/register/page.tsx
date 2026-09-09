'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Leaf,
  User,
  Wheat,
  Users,
  ShoppingBasket,
  Truck,
  ArrowRight,
  Check,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { cn, isValidPhone } from '@/lib/utils';
import type { UserRole } from '@/types';

const ROLES: Array<{ role: UserRole; icon: React.ComponentType<{ className?: string }>; descKey: string }> = [
  { role: 'consumer', icon: User, descKey: 'roleConsumer' },
  { role: 'farmer', icon: Wheat, descKey: 'roleFarmer' },
  { role: 'fpo', icon: Users, descKey: 'roleFpo' },
  { role: 'bulk_buyer', icon: ShoppingBasket, descKey: 'roleBulkBuyer' },
  { role: 'delivery_partner', icon: Truck, descKey: 'roleDelivery' },
];

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const language = useUIStore((state) => state.language);
  const initialRole = (searchParams.get('role') as UserRole | null) ?? 'consumer';

  const { register } = useAuth();

  const [role, setRole] = useState<UserRole>(initialRole);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validRole = ROLES.find((r) => r.role === role);

  const handleSendOtp = () => {
    setError(null);
    if (!isValidPhone(phone)) {
      setError(t('auth.phoneError', language));
      return;
    }
    setOtpSent(true);
  };

  const handleRegister = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError(t('validation.required', language).replace('{{field}}', t('auth.firstName', language)));
      return;
    }
    if (!isValidPhone(phone)) {
      setError(t('auth.phoneError', language));
      return;
    }
    setLoading(true);
    try {
      await register({ name, phoneNumber: phone, role, email: email || undefined, password: password || undefined });
      router.push(role === 'farmer' || role === 'fpo' ? '/producer/dashboard' : '/');
    } catch {
      setError(t('error.somethingWentWrong', language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md">
            <Leaf className="h-6 w-6" />
          </span>
          <span className="text-2xl font-bold text-primary-700">{t('app.name', language)}</span>
        </Link>

        <div className="rounded-2xl border border-charcoal-100 bg-white p-6 shadow-lg sm:p-8">
          <h1 className="text-xl font-bold text-charcoal-800">{t('auth.register', language)}</h1>
          <p className="mt-1 text-sm text-charcoal-500">{t('auth.roleDescription', language)}</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            {ROLES.map(({ role: r, icon: Icon, descKey }) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-all',
                  role === r ? 'border-primary-600 bg-primary-50' : 'border-charcoal-200 hover:border-primary-300'
                )}
              >
                <Icon className={cn('h-5 w-5', role === r ? 'text-primary-700' : 'text-charcoal-400')} />
                <span className={cn('text-xs font-semibold', role === r ? 'text-primary-800' : 'text-charcoal-600')}>
                  {t(`auth.${descKey}`, language)}
                </span>
                {role === r && <Check className="h-3.5 w-3.5 text-primary-700" />}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <Input
              label={t('auth.firstName', language)}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={validRole?.role === 'farmer' ? 'Ex. Kasirajan Murugan' : 'Your full name'}
            />
            <Input
              label={t('auth.phone', language)}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder={t('auth.phonePlaceholder', language)}
              inputMode="numeric"
              icon={<Smartphone className="h-4 w-4" />}
            />

            {!otpSent ? (
              <Button size="lg" fullWidth variant="outline" onClick={handleSendOtp}>
                {t('auth.sendOtp', language)}
              </Button>
            ) : (
              <Input
                label={t('auth.enterOtp', language)}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="••••••"
              />
            )}

            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-charcoal-500 hover:text-primary-700">
                {t('auth.or', language)} + {t('auth.loginWithEmail', language)}
              </summary>
              <div className="mt-3 space-y-3">
                <Input
                  label={t('auth.email', language)}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <Input
                  label={t('auth.password', language)}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  hint={t('auth.passwordHint', language)}
                />
              </div>
            </details>

            <Button size="lg" fullWidth loading={loading} onClick={handleRegister}>
              {t('auth.createFreeAccount', language)}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-6 border-t border-charcoal-100 pt-4 text-center">
            <p className="text-sm text-charcoal-500">
              {t('auth.alreadyHaveAccount', language)}{' '}
              <Link href="/login" className="font-semibold text-primary-700 hover:underline">
                {t('auth.login', language)}
              </Link>
            </p>
            <p className="mt-2 text-[11px] text-charcoal-400">{t('auth.terms', language)}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RegisterContent />
    </Suspense>
  );
}