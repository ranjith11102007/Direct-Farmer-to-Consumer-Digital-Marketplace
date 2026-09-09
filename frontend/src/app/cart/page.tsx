'use client';

import Link from 'next/link';
import { Trash2, ArrowLeft, ShoppingCart, Leaf, ChevronRight } from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { CategoryNav } from '@/components/layout/category-nav';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QuantitySelector } from '@/components/ui/quantity-selector';
import { EmptyState } from '@/components/ui/empty-state';
import { useCartStore, useUIStore } from '@/store';
import { t } from '@/i18n';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();
  const language = useUIStore((state) => state.language);
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();

  const subtotal = items.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= 200 ? 0 : 40;
  const platformFee = subtotal === 0 ? 0 : 10;
  const total = subtotal + deliveryFee + platformFee;
  const farmerShare = items.reduce((sum, item) => sum + (item.farmerShare ?? item.pricePerUnit * 0.7) * item.quantity, 0);

  return (
    <>
      <PromoStrip />
      <Header />
      <CategoryNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-charcoal-800">{t('cart.title', language)}</h1>
            <p className="mt-1 text-sm text-charcoal-500">
              {items.length > 0 && `${items.reduce((s, i) => s + i.quantity, 0)} ${t('products.items', language)}`}
            </p>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart}>
              <Trash2 className="h-4 w-4" /> {t('cart.empty', language)}
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState
            title={t('cart.empty', language)}
            description={t('cart.emptySubtitle', language)}
            icon={<ShoppingCart className="h-7 w-7" />}
            action={
              <Link href="/marketplace">
                <Button>{t('cart.startShopping', language)}</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              {items.map((item) => (
                <Card key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-bold text-white">
                      {getInitials(item.product?.name ?? 'P')}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/product/${item.productId}`} className="text-sm font-semibold text-charcoal-800 hover:text-primary-700">
                          {item.product?.name}
                        </Link>
                        <p className="flex items-center gap-1 text-xs text-charcoal-400">
                          <Leaf className="h-3 w-3 text-primary-500" />
                          {item.product?.producer?.name}
                        </p>
                        <p className="mt-0.5 text-xs text-charcoal-500">
                          {item.product?.sourceLocation?.district} • {t('products.harvestDate', language)} {item.product?.harvestDate ? formatDate(item.product.harvestDate) : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="rounded-lg p-1.5 text-charcoal-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label={t('cart.remove', language)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <QuantitySelector
                          quantity={item.quantity}
                          onChange={(q) => updateQuantity(item.productId, q)}
                          size="sm"
                        />
                        <span className="text-sm font-medium text-charcoal-700">
                          {formatCurrency(item.pricePerUnit)}/{item.unit}
                        </span>
                      </div>
                      <span className="text-base font-bold text-primary-700">{formatCurrency(item.pricePerUnit * item.quantity)}</span>
                    </div>
                  </div>
                </Card>
              ))}

              <div className="flex items-center justify-between rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-3">
                <p className="text-xs text-charcoal-500">{t('cart.weightLossUpdate', language)}</p>
                <Link href="/marketplace" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">
                  {t('cart.continueShopping', language)}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="lg:sticky lg:top-24">
                <h2 className="mb-3 text-sm font-semibold text-charcoal-800">{t('cart.title', language)}</h2>
                <div className="space-y-1.5 text-sm">
                  <PriceLine label={t('cart.subtotal', language)} value={formatCurrency(subtotal)} />
                  <PriceLine label={t('cart.deliveryFee', language)} value={deliveryFee === 0 ? t('common.none', language) : formatCurrency(deliveryFee)} highlight={deliveryFee === 0} />
                  <PriceLine label={t('cart.platformFee', language)} value={formatCurrency(platformFee)} />
                  <div className="border-t border-dashed border-charcoal-200 pt-2">
                    <div className="flex justify-between text-base font-bold text-charcoal-800">
                      <span>{t('cart.total', language)}</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-primary-50 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-700">
                    <Leaf className="h-3.5 w-3.5" />
                    {t('cart.estimatedFarmerShare', language)}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-primary-800">{formatCurrency(farmerShare)}</p>
                  <p className="mt-0.5 text-[10px] text-primary-600">{t('cart.priceNote', language)}</p>
                </div>

                <Button size="lg" fullWidth className="mt-4" onClick={() => router.push('/checkout')}>
                  {t('cart.checkout', language)}
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <p className="mt-2 text-center text-[10px] text-charcoal-400">{t('cart.allergensNote', language)}</p>
              </Card>
            </div>
          </div>
        )}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

function PriceLine({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-charcoal-500">{label}</span>
      <span className={highlight ? 'font-medium text-primary-700' : 'text-charcoal-800'}>{value}</span>
    </div>
  );
}