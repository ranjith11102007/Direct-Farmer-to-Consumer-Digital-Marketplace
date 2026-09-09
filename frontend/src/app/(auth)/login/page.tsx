'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf, Smartphone, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store';
import { t } from '@/i18n';
import { isValidPhone } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const language = useUIStore((state) => state.language);
  const { verifyOtp, requestOtp, loginWithEmail } = useAuth();

  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setError(null);
    if (!isValidPhone(phone)) {
      setError(t('auth.phoneError', language));
      return;
    }
    setLoading(true);
    const success = await requestOtp(phone);
    setLoading(false);
    if (success) {
      setOtpSent(true);
    }
  };

  const handleVerify = async () => {
    setError(null);
    if (otp.length !== 6) {
      setError(t('validation.invalidOtp', language));
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone, otp);
      router.push('/');
    } catch {
      setError(t('auth.otpError', language));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push('/');
    } catch {
      setError(t('auth.invalidCredentials', language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md">
            <Leaf className="h-6 w-6" />
          </span>
          <span className="text-2xl font-bold text-primary-700">{t('app.name', language)}</span>
        </Link>

        <div className="rounded-2xl border border-charcoal-100 bg-white p-6 shadow-lg sm:p-8">
          <h1 className="text-xl font-bold text-charcoal-800">{t('auth.login', language)}</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            {mode === 'phone' ? t('auth.verifyPhone', language) : t('auth.loginWithEmail', language)}
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-1 rounded-lg bg-charcoal-100 p-1">
            {(['phone', 'email'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={mode === m ? 'flex-1 rounded-md bg-white py-1.5 text-sm font-semibold text-primary-700 shadow-sm' : 'flex-1 rounded-md py-1.5 text-sm text-charcoal-500'}
              >
                {m === 'phone' ? (
                  <span className="flex items-center justify-center gap-1.5"><Smartphone className="h-4 w-4" /> Mobile</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5"><Mail className="h-4 w-4" /> Email</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            {mode === 'phone' && (
              <>
                {!otpSent ? (
                  <>
                    <Input
                      label={t('auth.phone', language)}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder={t('auth.phonePlaceholder', language)}
                      inputMode="numeric"
                      icon={<Smartphone className="h-4 w-4" />}
                    />
                    <Button size="lg" fullWidth loading={loading} onClick={handleSendOtp}>
                      {t('auth.sendOtp', language)}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-charcoal-600">
                      {t('auth.otpSent', language)} <b>{phone}</b>
                    </p>
                    <Input
                      label={t('auth.enterOtp', language)}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      placeholder="••••••"
                    />
                    <Button size="lg" fullWidth loading={loading} onClick={handleVerify}>
                      {t('auth.verifyOtp', language)}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <button onClick={() => setOtpSent(false)} className="w-full text-center text-xs text-primary-700 hover:underline">
                      {t('auth.resendOtp', language).replace('{{seconds}}', '0')}
                    </button>
                  </>
                )}
              </>
            )}

            {mode === 'email' && (
              <>
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
                />
                <div className="flex justify-end">
                  <button className="text-xs font-medium text-primary-700 hover:underline">
                    {t('auth.forgotPassword', language)}
                  </button>
                </div>
                <Button size="lg" fullWidth loading={loading} onClick={handleEmailLogin}>
                  {t('auth.login', language)}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="mt-6 border-t border-charcoal-100 pt-4 text-center">
            <p className="text-sm text-charcoal-500">
              {t('auth.noAccount', language)}{' '}
              <Link href="/register" className="font-semibold text-primary-700 hover:underline">
                {t('auth.createFreeAccount', language)}
              </Link>
            </p>
            <p className="mt-2 text-[11px] text-charcoal-400">{t('auth.terms', language)}</p>
          </div>
        </div>
      </div>
    </main>
  );
}