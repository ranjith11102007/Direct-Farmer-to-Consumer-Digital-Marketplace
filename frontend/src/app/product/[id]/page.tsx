'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Leaf,
  MapPin,
  ShieldCheck,
  Star,
  ShoppingCart,
  Heart,
  ChevronRight,
  Truck,
  BadgeCheck,
  Clock,
  RotateCcw,
  Scale,
  Tag,
  Sparkles,
} from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { CategoryNav } from '@/components/layout/category-nav';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/ui/rating';
import { Card } from '@/components/ui/card';
import { QuantitySelector } from '@/components/ui/quantity-selector';
import { PageLoader } from '@/components/ui/loading';
import { TraceabilityTimeline } from '@/components/marketplace/traceability-timeline';
import { useProduct } from '@/hooks/useApi';
import { useCartStore, useUIStore, useMarketplaceStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product } from '@/types';

const MOCK_REVIEWS = [
  { id: '1', userName: 'S. Lakshmi', rating: 5, comment: 'Very fresh, tasted amazing! The traceability is great.', createdAt: new Date().toISOString(), verifiedPurchase: true },
  { id: '2', userName: 'M. Karthik', rating: 4, comment: 'Good quality, arrived earlier than expected.', createdAt: new Date(Date.now() - 86400000).toISOString(), verifiedPurchase: true },
  { id: '3', userName: 'R. Priya', rating: 5, comment: 'Best prices and absolutely fresh harvest.', createdAt: new Date(Date.now() - 172800000).toISOString(), verifiedPurchase: true },
];

const MOCK_TRACE_ONE = [
  { id: '1', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'harvested', location: 'Thennur Village, Thanjavur', description: 'Harvested at first light, graded on field', operator: 'Kasirajan M.', verified: true },
  { id: '2', timestamp: new Date(Date.now() - 2 * 86400000 + 3 * 3600000).toISOString(), status: 'collected', location: 'Thennur Collection Center', description: 'Quality checked, moisture measured', operator: 'Vaikkal Logistics', verified: true },
  { id: '3', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), status: 'in_cold_storage', location: 'Thanjavur DC', description: 'Cold chain maintained at 8°C', operator: 'Vaikkal DC Team', verified: true },
  { id: '4', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'out_for_delivery', location: 'Trichy East Zone', description: 'Loaded on delivery van VK-4521', operator: 'Venkatesh R.', verified: true },
];

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params.id;
  const language = useUIStore((state) => state.language);
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'traceability' | 'reviews'>('details');

  const { data, isLoading, isError } = useProduct(productId.startsWith('local-') ? '' : productId);
  const localProduct = useMarketplaceStore((s) => s.farmerProducts.find((p) => p.id === productId));

  if (isLoading && !productId.startsWith('local-')) {
    return (
      <>
        <PromoStrip />
        <Header />
        <CategoryNav />
        <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-8">
          <PageLoader text={t('common.loading', language)} />
        </main>
        <Footer />
        <MobileNav />
      </>
    );
  }

  const product: Product = data?.product ?? (localProduct ? {
    ...localProduct,
    nameTa: '',
    basePricePerUnit: localProduct.currentPricePerUnit,
    minOrderQuantity: 1,
    grade: localProduct.grade ?? 'A',
    isOrganicCertified: localProduct.isOrganic ?? false,
    organicCertified: localProduct.isOrganic ?? false,
    totalRatings: 0,
    producer: { id: localProduct.farmerId, name: localProduct.farmerName, entityType: 'farmer' as const },
    harvestDate: localProduct.createdAt,
    deliveryEstimateMins: 240,
    packagingType: 'loose',
    shelfLifeDays: 5,
    certifications: [],
    tags: [],
    updatedAt: localProduct.createdAt,
    categoryId: '',
    fpoId: undefined,
    descriptionTa: undefined,
    unitTa: undefined,
  } : {
    id: productId,
    name: 'Farm Fresh Tomato',
    nameTa: 'பண்ணை புதிய தக்காளி',
    description: 'Harvest-fresh hybrid tomatoes grown with integrated pest management. Picked at peak ripeness and delivered within 24 hours.',
    category: 'vegetables',
    currentPricePerUnit: 42,
    basePricePerUnit: 48,
    unit: 'kg',
    minOrderQuantity: 1,
    availableQuantity: 120,
    grade: 'A',
    isOrganicCertified: true,
    organicCertified: true,
    avgRating: 4.6,
    totalRatings: 128,
    producer: { id: 'p1', name: 'Kasirajan Farms', entityType: 'farmer' },
    sourceLocation: { district: 'Thanjavur', state: 'Tamil Nadu' },
    harvestDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    deliveryEstimateMins: 240,
    packagingType: 'bag1kg',
    shelfLifeDays: 4,
    stockStatus: 'in_stock',
    certifications: ['GAP Certified'],
    tags: ['hybrid', 'pest-managed'],
    createdAt: new Date().toISOString(),
  }) as unknown as Product;

  const handleAddToCart = () => {
    addItem({
      id: `${product.id}-default`,
      productId: product.id,
      product,
      quantity,
      unit: product.unit ?? 'kg',
      pricePerUnit: product.currentPricePerUnit,
      farmerShare: product.currentPricePerUnit * 0.7,
      addedAt: new Date().toISOString(),
    });
    toast.success(t('products.addToCartSuccess', language));
  };

  const farmerShare = product.currentPricePerUnit * 0.7;

  const tabs = [
    { key: 'details', label: t('products.productDescription', language) },
    { key: 'traceability', label: t('productDetail.traceability', language) },
    { key: 'reviews', label: `${t('productDetail.reviewsHeading', language)} (${product.totalRatings})` },
  ] as const;

  return (
    <>
      <PromoStrip />
      <Header />
      <CategoryNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-charcoal-400" aria-label="Breadcrumb">
          <span>{t('nav.home', language)}</span>
          <ChevronRight className="h-3 w-3" />
          <span>{t('nav.marketplace', language)}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-charcoal-600">{product.name}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="relative h-72 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-100 via-primary-50 to-secondary-100 sm:h-96">
              <div className="flex h-full items-center justify-center">
                <span className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-6xl font-bold text-white shadow-xl">
                  {getInitials(product.name)}
                </span>
              </div>
              <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                {product.isOrganicCertified && (
                  <Badge variant="organic" icon={<Leaf className="h-3 w-3" />}>
                    {t('products.certifiedOrganic', language)}
                  </Badge>
                )}
                <Badge variant="premium">{product.grade}</Badge>
              </div>
              <button
                onClick={() => setWishlisted((v) => !v)}
                className={cn(
                  'absolute right-3 top-3 rounded-full p-2.5 backdrop-blur transition-colors',
                  wishlisted ? 'bg-red-500 text-white' : 'bg-white/85 text-charcoal-500 hover:text-red-500'
                )}
                aria-label={wishlisted ? t('products.removeFromWishlist', language) : t('products.addToWishlist', language)}
              >
                <Heart className={cn('h-5 w-5', wishlisted && 'fill-current')} />
              </button>
              <span className="absolute bottom-3 left-3 rounded-full bg-charcoal-950/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                {t('products.harvestDate', language)}: {formatDate(product.harvestDate)}
              </span>
            </div>

            <Card className="flex items-center justify-between">
              <p className="text-xs font-medium text-charcoal-600">
                <ShieldCheck className="mr-1.5 inline h-4 w-4 text-primary-600" />
                {t('productDetail.qualityChecked', language)}
              </p>
              <p className="text-xs font-medium text-charcoal-600">
                <RotateCcw className="mr-1.5 inline h-4 w-4 text-primary-600" />
                {t('productDetail.returnPolicy', language)}
              </p>
              <p className="text-xs font-medium text-charcoal-600">
                <Clock className="mr-1.5 inline h-4 w-4 text-primary-600" />
                {t('products.deliveryBy', language)} {t('products.tomorrow', language)}
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-charcoal-900 sm:text-3xl">{product.name}</h1>
              <p className="font-tamil mt-0.5 text-base text-charcoal-400">{product.nameTa}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Rating rating={product.avgRating} count={product.totalRatings} showValue size="md" />
                <span className="text-sm text-charcoal-400">•</span>
                <span className="flex items-center gap-1 text-sm text-charcoal-500">
                  {product.stockStatus === 'in_stock' ? t('products.inStock', language) : t('products.lowStock', language).replace('{{qty}}', String(product.availableQuantity))}
                </span>
                <span className="text-sm text-charcoal-400">•</span>
                <span className="text-sm text-charcoal-500">
                  {product.availableQuantity} {product.unit}
                </span>
              </div>
            </div>

            <div className="flex items-end gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-4">
              <div>
                <span className="text-3xl font-extrabold text-primary-700">{formatCurrency(product.currentPricePerUnit)}</span>
                <span className="text-sm text-charcoal-500"> / {product.unit}</span>
              </div>
              {product.basePricePerUnit > product.currentPricePerUnit && (
                <span className="text-base text-charcoal-400 line-through">{formatCurrency(product.basePricePerUnit)}</span>
              )}
            </div>

            <div className="rounded-xl border border-charcoal-200/70 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-charcoal-700">{t('products.priceBreakdown', language)}</p>
                <span className="text-xs text-primary-600">{t('products.farmerShare', language)}: {formatCurrency(farmerShare)}/{product.unit}</span>
              </div>
              <div className="mt-2 space-y-1.5 text-sm">
                <PriceRow label={t('products.farmerShare', language)} value={`${formatCurrency(farmerShare)} (70%)`} highlight />
                <PriceRow label="Grading & packaging" value={formatCurrency(2)} />
                <PriceRow label="Logistics" value={formatCurrency(5)} />
                <PriceRow label="Platform fee" value={formatCurrency(3.6)} />
              </div>
            </div>

            <div className="rounded-xl border border-charcoal-200/70 bg-white p-4">
              <p className="text-sm font-semibold text-charcoal-700">{t('productDetail.producerInfo', language)}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 font-bold text-white">
                  {getInitials(product.producer?.name ?? 'F')}
                </span>
                <div className="flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold text-charcoal-800">
                    {product.producer?.name}
                    <BadgeCheck className="h-4 w-4 text-primary-600" />
                  </p>
                  <p className="flex items-center gap-1 text-xs text-charcoal-500">
                    <MapPin className="h-3 w-3 text-primary-600" />
                    {product.sourceLocation?.district}, {product.sourceLocation?.state}
                  </p>
                </div>
                <Badge variant="success">{t('productDetail.producerVerified', language)}</Badge>
              </div>
              {product.certifications?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {product.certifications.map((cert) => (
                    <span key={cert} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                      <Sparkles className="mr-1 inline h-3 w-3" /> {cert}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-charcoal-200/70 bg-white p-4">
              <p className="text-sm font-semibold text-charcoal-700">{t('productDetail.deliverySlots', language)}</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                {[t('checkout.morningSlot', language), t('checkout.afternoonSlot', language), t('checkout.eveningSlot', language), t('checkout.nightSlot', language)].map((slot, index) => (
                  <button key={slot} className={cn('rounded-lg border px-3 py-2 text-xs font-medium transition-colors', index === 0 ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-charcoal-200 text-charcoal-600 hover:border-primary-300')}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <QuantitySelector quantity={quantity} onChange={setQuantity} min={product.minOrderQuantity} max={Math.min(product.availableQuantity, 50)} size="lg" />
              <Button size="lg" fullWidth onClick={handleAddToCart} disabled={product.stockStatus === 'out_of_stock'}>
                <ShoppingCart className="h-5 w-5" />
                {t('products.addToCart', language)}
              </Button>
              <Button size="lg" variant="outline" onClick={() => {
                handleAddToCart();
                router.push('/checkout');
              }} disabled={product.stockStatus === 'out_of_stock'}>
                Buy Now
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-4 flex gap-1 border-b border-charcoal-100">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'details' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary-600" />
                  <h3 className="text-sm font-semibold text-charcoal-800">{t('productDetail.productIdentifiers', language)}</h3>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <DetailItem icon={<Scale className="h-4 w-4" />} label={t('products.packaging', language)} value={product.packagingType} />
                  <DetailItem icon={<Clock className="h-4 w-4" />} label={t('producer.shelfLife', language)} value={`${product.shelfLifeDays} ${t('days.sunday', language) === 'sunday' ? 'days' : 'days'}`} />
                  <DetailItem icon={<MapPin className="h-4 w-4" />} label={t('products.from', language)} value={product.sourceLocation?.district ?? ''} />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-charcoal-600">{product.description}</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-primary-600" />
                  <h3 className="text-sm font-semibold text-charcoal-800">{t('productDetail.storage', language)}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-600">
                  Store in cool, dry place. Refrigerate after opening for best freshness. Consume within {product.shelfLifeDays} days.
                </p>
                <p className="mt-3 text-xs text-charcoal-500">{t('cart.weightLossUpdate', language)}</p>
              </Card>
            </div>
          )}

          {activeTab === 'traceability' && (
            <TraceabilityTimeline
              events={MOCK_TRACE_ONE}
              productName={product.name}
              batchNumber="VK-B-208461"
              farmerName={product.producer?.name}
              farmLocation={`${(product.sourceLocation as { village?: string }).village ?? 'Thennur'} ${product.sourceLocation?.district}`}
            />
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-charcoal-200/70 bg-white p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-center">
                  <div>
                    <p className="text-xl font-bold text-primary-700">{product.avgRating}</p>
                    <Rating rating={product.avgRating} size="xs" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal-800">{product.totalRatings} {t('products.reviews', language)}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-charcoal-500">
                    <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" />
                    {t('products.inStock', language)} • Farm-fresh satisfaction guaranteed
                  </p>
                </div>
              </div>

              {MOCK_REVIEWS.map((review) => (
                <Card key={review.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                        {getInitials(review.userName)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-charcoal-800">
                          {review.userName}
                          {review.verifiedPurchase && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-semibold text-green-700">
                              <BadgeCheck className="h-3 w-3" /> Verified
                            </span>
                          )}
                        </p>
                        <Rating rating={review.rating} size="xs" />
                      </div>
                    </div>
                    <span className="text-xs text-charcoal-400">{formatDate(review.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-charcoal-600">{review.comment}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

function PriceRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={highlight ? 'font-medium text-primary-700' : 'text-charcoal-500'}>{label}</span>
      <span className={highlight ? 'font-bold text-primary-700' : 'text-charcoal-700'}>{value}</span>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-charcoal-50 p-2.5">
      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-charcoal-400">
        {icon} {label}
      </span>
      <p className="mt-0.5 text-sm font-medium text-charcoal-700">{value}</p>
    </div>
  );
}