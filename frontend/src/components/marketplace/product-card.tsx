'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart, Eye, Leaf, MapPin, PackageX } from 'lucide-react';
import { t } from '@/i18n';
import { useCartStore, useUIStore } from '@/store';
import { cn, formatCurrency, formatPricePerUnit, getInitials } from '@/lib/utils';
import { Rating } from '@/components/ui/rating';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import type { Product } from '@/types';

export interface ProductCardProps {
  product: Product;
  onWishlistToggle?: (productId: string) => void;
  isWishlisted?: boolean;
}

const UNIT_LABELS: Record<string, string> = {
  kg: 'kg',
  g: 'g',
  bundle: 'bundle',
  dozen: 'dozen',
  litre: 'L',
};

export function ProductCard({ product, onWishlistToggle, isWishlisted = false }: ProductCardProps) {
  const language = useUIStore((state) => state.language);
  const addItem = useCartStore((state) => state.addItem);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(product.unit || 'kg');

  const outOfStock = product.stockStatus === 'out_of_stock' || product.availableQuantity <= 0;
  const lowStock = product.stockStatus === 'low_stock' || (product.availableQuantity > 0 && product.availableQuantity < 20);

  const handleAddToCart = () => {
    if (outOfStock) return;
    addItem({
      id: `${product.id}-${selectedUnit}`,
      productId: product.id,
      product,
      quantity: 1,
      unit: selectedUnit,
      pricePerUnit: product.currentPricePerUnit,
      farmerShare: product.currentPricePerUnit * 0.7,
      addedAt: new Date().toISOString(),
    });
    toast.success(t('products.addToCartSuccess', language));
  };

  const handleBuyNow = () => {
    if (outOfStock) return;
    addItem({
      id: `${product.id}-${selectedUnit}`,
      productId: product.id,
      product,
      quantity: 1,
      unit: selectedUnit,
      pricePerUnit: product.currentPricePerUnit,
      farmerShare: product.currentPricePerUnit * 0.7,
      addedAt: new Date().toISOString(),
    });
    window.location.href = '/checkout';
  };

  const handleWishlist = () => {
    onWishlistToggle?.(product.id);
    !isWishlisted
      ? toast.success(t('products.addToWishlist', language))
      : toast.success(t('products.removeFromWishlist', language));
  };

  return (
    <>
      <article
        className="group relative flex flex-col overflow-hidden rounded-xl border border-charcoal-200/70 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
        aria-label={product.name}
      >
        <Link href={`/product/${product.id}`} className="relative block h-40 overflow-hidden bg-gradient-to-br from-primary-100 via-primary-50 to-secondary-50">
          <div className="flex h-full items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-2xl font-bold text-white shadow-sm">
              {getInitials(product.name)}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900/10 to-transparent" />

          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            {product.isOrganicCertified && (
              <Badge variant="organic" icon={<Leaf className="h-3 w-3" />}>
                {t('products.certifiedOrganic', language)}
              </Badge>
            )}
            {product.grade && product.grade !== 'A' && (
              <Badge variant="premium">
                {product.grade === 'Organic' ? t('products.organic', language) : product.grade}
              </Badge>
            )}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleWishlist();
            }}
            className={cn(
              'absolute right-2 top-2 rounded-full p-1.5 backdrop-blur-sm transition-colors',
              isWishlisted
                ? 'bg-red-500 text-white'
                : 'bg-white/80 text-charcoal-500 hover:bg-white hover:text-red-500'
            )}
            aria-label={isWishlisted ? t('products.removeFromWishlist', language) : t('products.addToWishlist', language)}
          >
            <Heart className={cn('h-4 w-4', isWishlisted && 'fill-current')} />
          </button>

          {product.harvestDate && (
            <span className="absolute bottom-2 right-2 rounded-full bg-secondary-100/95 px-2 py-0.5 text-[10px] font-semibold text-secondary-700">
              {t('products.harvestDate', language)}: {new Date(product.harvestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </Link>

        <div className="flex flex-1 flex-col p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/product/${product.id}`} className="block truncate text-sm font-semibold text-charcoal-800 hover:text-primary-700">
                {product.name}
              </Link>
              {product.nameTa && (
                <p className="truncate font-tamil text-xs text-charcoal-400">{product.nameTa}</p>
              )}
            </div>
            <Rating rating={product.avgRating} count={product.totalRatings} size="xs" />
          </div>

          <p className="mt-1 flex items-center gap-1 text-xs text-charcoal-500">
            <span className="truncate">{product.producer?.name || t('products.soldBy', language)}</span>
            <span className="text-charcoal-300">•</span>
            <MapPin className="h-3 w-3 shrink-0 text-primary-600" />
            <span className="truncate">{product.sourceLocation?.district ?? ''}</span>
          </p>

          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-primary-700">
              {formatCurrency(product.currentPricePerUnit)}
            </span>
            <span className="text-xs text-charcoal-500">/ {UNIT_LABELS[selectedUnit] ?? selectedUnit}</span>
            {product.currentPricePerUnit < product.basePricePerUnit && (
              <span className="text-xs text-charcoal-400 line-through">
                {formatCurrency(product.basePricePerUnit)}
              </span>
            )}
          </div>

          {!outOfStock && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-charcoal-500">
                {lowStock
                  ? t('products.lowStock', language).replace('{{qty}}', String(product.availableQuantity))
                  : `${t('products.inStock', language)} • ${product.availableQuantity} ${selectedUnit}`}
              </span>
              <span className="text-[11px] font-medium text-primary-600">
                {t('products.deliveryBy', language)} {t('products.tomorrow', language)}
              </span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            {outOfStock ? (
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-charcoal-100 px-3 py-2 text-xs font-semibold text-charcoal-400">
                <PackageX className="h-4 w-4" />
                {t('products.outOfStock', language)}
              </span>
            ) : (
              <>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAddToCart}
                  aria-label={`${t('products.addToCart', language)} - ${product.name}`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {t('products.addToCart', language)}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={handleBuyNow}
                  aria-label={`Buy Now - ${product.name}`}
                >
                  Buy Now
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowQuickView(true)} aria-label={t('products.quickView', language)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </article>

      <Modal open={showQuickView} onClose={() => setShowQuickView(false)} title={product.name} size="md">
        <div className="space-y-4">
          <div className="flex h-48 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-3xl font-bold text-white">
              {getInitials(product.name)}
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary-700">{formatCurrency(product.currentPricePerUnit)}/{selectedUnit}</span>
              <Rating rating={product.avgRating} count={product.totalRatings} size="sm" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-charcoal-600 line-clamp-3">{product.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-charcoal-600">
            <div className="rounded-lg bg-charcoal-50 px-3 py-2">
              <span className="text-charcoal-400">{t('producer.district', language) === 'producer.district' ? t('products.from', language) : t('producer.district', language)}</span>
              <p className="font-medium">{product.sourceLocation?.district ?? '—'}</p>
            </div>
            <div className="rounded-lg bg-charcoal-50 px-3 py-2">
              <span className="text-charcoal-400">{t('products.grade', language)}</span>
              <p className="font-medium">{product.grade}</p>
            </div>
          </div>
          <Link href={`/product/${product.id}`} className="flex justify-end">
            <Button variant="outline" size="sm">{t('products.viewDetails', language)}</Button>
          </Link>
        </div>
      </Modal>
    </>
  );
}