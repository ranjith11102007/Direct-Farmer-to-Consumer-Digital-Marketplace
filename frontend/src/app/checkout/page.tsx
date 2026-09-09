'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Clock,
  FileText,
  CreditCard,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Truck,
} from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { CategoryNav } from '@/components/layout/category-nav';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useCartStore, useUIStore } from '@/store';
import { useCreateOrder } from '@/hooks/useApi';
import { t } from '@/i18n';
import { cn, formatCurrency, generateOrderNumber } from '@/lib/utils';
import { toast } from 'sonner';

const STEPS = ['address', 'slot', 'review', 'payment', 'confirmation'] as const;
type Step = (typeof STEPS)[number];

const SLOTS = [
  { label: 'checkout.morningSlot', time: '6:00 AM - 10:00 AM' },
  { label: 'checkout.afternoonSlot', time: '10:00 AM - 2:00 PM' },
  { label: 'checkout.eveningSlot', time: '2:00 PM - 6:00 PM' },
  { label: 'checkout.nightSlot', time: '6:00 PM - 10:00 PM' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const language = useUIStore((state) => state.language);
  const { items, clearCart } = useCartStore();
  const createOrder = useCreateOrder();
  const [step, setStep] = useState<Step>('address');

  const subtotal = items.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
  const deliveryFee = subtotal >= 200 ? 0 : 40;
  const platformFee = 10;
  const total = subtotal + deliveryFee + platformFee;
  const farmerShare = items.reduce((sum, item) => sum + (item.farmerShare ?? item.pricePerUnit * 0.7) * item.quantity, 0);

  const [address, setAddress] = useState({
    label: 'home',
    addressLine1: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
  });
  const [slot, setSlot] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const stepIndex = STEPS.indexOf(step);

  const goTo = (next: Step) => {
    if (step === 'address' && !address.addressLine1.trim()) {
      toast.error(t('validation.requiredField', language));
      return;
    }
    setStep(next);
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    const number = generateOrderNumber();
    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
        })),
        deliveryAddress: address,
        deliverySlot: SLOTS[slot],
        paymentMethod,
        orderNumber: number,
      };
      await createOrder.mutateAsync(payload as never);
      setOrderNumber(number);
      setStep('confirmation');
      clearCart();
    } catch {
      // toast handled in hook
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0 && step !== 'confirmation') {
    return (
      <>
        <PromoStrip />
        <Header />
        <CategoryNav />
        <main className="mx-auto max-w-2xl px-4 py-16">
          <Card className="text-center">
            {t('cart.empty', language)}
            <div className="mt-4 flex justify-center">
              <Button onClick={() => router.push('/marketplace')}>{t('cart.startShopping', language)}</Button>
            </div>
          </Card>
        </main>
        <Footer />
        <MobileNav />
      </>
    );
  }

  return (
    <>
      <PromoStrip />
      <Header />
      <CategoryNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-charcoal-800">{t('checkout.title', language)}</h1>

        <ol className="mt-6 flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, index) => (
            <li key={s} className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => index < stepIndex && setStep(s)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  index === stepIndex
                    ? 'bg-primary-600 text-white'
                    : index < stepIndex
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-charcoal-100 text-charcoal-400'
                )}
                aria-current={index === stepIndex ? 'step' : undefined}
              >
                {index < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : <StepIcon step={s} />}
                {t(`checkout.step${capitalize(s)}`, language) === `checkout.step${capitalize(s)}` ? s : t(`checkout.step${capitalize(s)}`, language)}
              </button>
              {index < STEPS.length - 1 && <ChevronRight className="h-3 w-3 shrink-0 text-charcoal-300" />}
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {step === 'address' && (
              <AddressStep address={address} setAddress={setAddress} />
            )}

            {step === 'slot' && (
              <Card>
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary-600" />
                  <h2 className="text-sm font-semibold text-charcoal-800">{t('checkout.chooseSlot', language)}</h2>
                </div>
                <div className="space-y-2">
                  {SLOTS.map((s, index) => (
                    <button
                      key={s.time}
                      onClick={() => setSlot(index)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                        slot === index ? 'border-primary-600 bg-primary-50' : 'border-charcoal-200 hover:border-primary-300'
                      )}
                    >
                      <span className={cn('h-4 w-4 rounded-full border-2', slot === index ? 'border-primary-600 bg-primary-600' : 'border-charcoal-300')} />
                      <div>
                        <p className="text-sm font-semibold text-charcoal-800">{t(s.label, language)}</p>
                        <p className="text-xs text-charcoal-400">{s.time}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {step === 'review' && (
              <Card>
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-600" />
                  <h2 className="text-sm font-semibold text-charcoal-800">{t('checkout.stepReview', language)}</h2>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-charcoal-50 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-charcoal-800">{item.product?.name}</p>
                        <p className="text-xs text-charcoal-400">{item.quantity} × {formatCurrency(item.pricePerUnit)}/{item.unit}</p>
                      </div>
                      <span className="text-sm font-bold text-charcoal-800">{formatCurrency(item.pricePerUnit * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-700">
                    <Truck className="h-4 w-4" /> {t('cart.estimatedFarmerShare', language)}
                  </p>
                  <p className="text-sm font-bold text-primary-800">{formatCurrency(farmerShare)}</p>
                </div>
              </Card>
            )}

            {step === 'payment' && (
              <Card>
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary-600" />
                  <h2 className="text-sm font-semibold text-charcoal-800">{t('checkout.payingWith', language)}</h2>
                </div>
                <div className="space-y-2">
                  {(['upi', 'card', 'netbanking', 'cod', 'wallet'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                        paymentMethod === method ? 'border-primary-600 bg-primary-50' : 'border-charcoal-200 hover:border-primary-300'
                      )}
                    >
                      <span className={cn('h-4 w-4 rounded-full border-2', paymentMethod === method ? 'border-primary-600 bg-primary-600' : 'border-charcoal-300')} />
                      <span className="text-sm font-semibold text-charcoal-800">
                        {t(`checkout.paymentMethods.${method}`, language)}
                      </span>
                    </button>
                  ))}
                </div>

                {paymentMethod === 'upi' && (
                  <div className="mt-3">
                    <Input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder={t('checkout.upiIdPlaceholder', language)}
                      label="UPI ID"
                    />
                  </div>
                )}
                {paymentMethod === 'card' && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-3">
                      <Input label={t('checkout.cardNumber', language)} placeholder="4242 4242 4242 4242" inputMode="numeric" />
                    </div>
                    <Input label={t('checkout.cardExpiry', language)} placeholder="MM/YY" />
                    <Input label={t('checkout.cardCvv', language)} placeholder="•••" type="password" />
                  </div>
                )}
              </Card>
            )}

            {step === 'confirmation' && (
              <Card className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-9 w-9 text-green-600" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-charcoal-800">{t('checkout.orderPlaced', language)}</h2>
                <p className="mt-1 text-sm text-charcoal-500">
                  {t('checkout.orderNumber', language)}: <b className="text-primary-700">{orderNumber}</b>
                </p>
                <p className="mt-1 text-sm text-charcoal-500">
                  {t('checkout.estimatedDelivery', language)}: {new Date(Date.now() + 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button onClick={() => router.push(`/orders/${orderNumber}`)}>
                    {t('checkout.trackOrder', language)}
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/')}>
                    {t('checkout.backToHome', language)}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {step !== 'confirmation' && (
            <Card className="h-fit lg:sticky lg:top-24">
              <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('orders.total', language)}</h2>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-charcoal-500">{t('cart.subtotal', language)}</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-charcoal-500">{t('cart.deliveryFee', language)}</span><span>{deliveryFee === 0 ? t('common.none', language) : formatCurrency(deliveryFee)}</span></div>
                <div className="flex justify-between"><span className="text-charcoal-500">{t('cart.platformFee', language)}</span><span>{formatCurrency(platformFee)}</span></div>
                <div className="flex justify-between border-t border-dashed border-charcoal-200 pt-2 text-base font-bold text-charcoal-800">
                  <span>{t('checkout.totalPayable', language)}</span><span>{formatCurrency(total)}</span>
                </div>
              </div>

              {step === 'payment' ? (
                <Button size="lg" fullWidth className="mt-4" loading={placing} onClick={handlePlaceOrder}>
                  {paymentMethod === 'cod' ? t('checkout.payLater', language) : t('checkout.payNow', language).replace('{{amount}}', String(Math.round(total)))}
                </Button>
              ) : (
                <>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    {stepIndex > 0 && (
                      <Button variant="outline" size="lg" onClick={() => setStep(STEPS[stepIndex - 1])}>
                        <ChevronLeft className="h-4 w-4" /> {t('common.back', language)}
                      </Button>
                    )}
                    <Button size="lg" fullWidth onClick={() => goTo(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)])}>
                      {t('common.next', language)} <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-charcoal-400">{t('auth.terms', language)}</p>
                </>
              )}
            </Card>
          )}
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

function StepIcon({ step }: { step: Step }) {
  const props = { className: 'h-3.5 w-3.5' };
  switch (step) {
    case 'address':
      return <MapPin {...props} />;
    case 'slot':
      return <Clock {...props} />;
    case 'review':
      return <FileText {...props} />;
    case 'payment':
      return <CreditCard {...props} />;
    case 'confirmation':
      return <CheckCircle2 {...props} />;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function AddressStep({
  address,
  setAddress,
}: {
  address: typeof DEFAULT_ADDRESS;
  setAddress: (value: typeof DEFAULT_ADDRESS) => void;
}) {
  const language = useUIStore((state) => state.language);
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary-600" />
        <h2 className="text-sm font-semibold text-charcoal-800">{t('checkout.editAddress', language)}</h2>
      </div>
      <div className="space-y-3">
        <Input
          label={t('location.label', language)}
          value={address.label}
          onChange={(e) => setAddress({ ...address, label: e.target.value })}
        />
        <Input
          label={t('location.addressLine1', language)}
          value={address.addressLine1}
          onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={t('location.city', language)} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
          <Input label={t('location.district', language)} value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={t('location.state', language)} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
          <Input label={t('location.pincode', language)} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} inputMode="numeric" />
        </div>
      </div>
    </Card>
  );
}

const DEFAULT_ADDRESS = {
  label: 'home',
  addressLine1: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
};