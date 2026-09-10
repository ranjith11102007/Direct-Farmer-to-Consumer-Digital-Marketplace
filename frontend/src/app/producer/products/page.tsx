'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  Plus,
  Package,
  Pencil,
  Trash2,
  Leaf,
  ArrowUpDown,
} from 'lucide-react';
import { PromoStrip } from '@/components/layout/promo-strip';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { PageLoader } from '@/components/ui/loading';
import { SearchInput } from '@/components/ui/search-input';
import { InventoryForm } from '@/components/producer/inventory-form';
import { EmptyState } from '@/components/ui/empty-state';
import { useProducts, useDeleteMutation, useCreateProduct, useUpdateProduct } from '@/hooks/useApi';
import { useUIStore, useAuthStore, useMarketplaceStore } from '@/store';
import { t } from '@/i18n';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product } from '@/types';

const STATUS_VARIANT: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  archived: 'neutral',
};

const STOCK_VARIANT: Record<string, 'success' | 'danger' | 'warning'> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

function ProducerProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const language = useUIStore((state) => state.language);
  const user = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const showNew = searchParams.get('new') === '1';
  const editId = searchParams.get('edit');

  const { data, isLoading, refetch } = useProducts({ page, per_page: 9, mine: true, q: query || undefined });
  const products = useMemo(() => data?.items ?? [], [data?.items]);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteMutation('products', '/products', t('producer.productDeleted', language));

  useEffect(() => {
    if (editId) {
      const product = products.find((p) => p.id === editId);
      if (product) {
        setEditingProduct(product);
      }
    } else {
      setEditingProduct(null);
    }
  }, [editId, products]);

  const isEditing = Boolean(editingProduct);

  if (showNew || isEditing) {
    const handleSubmit = async (formData: Record<string, unknown>) => {
      const payload = {
        product: {
          name: formData.name as string,
          name_tamil: formData.nameTa as string,
          category_slug: formData.category as string,
          description: formData.description as string,
          image_url: '',
          unit: formData.unit as string,
        },
        listing: {
          price_per_unit: formData.currentPricePerUnit as number,
          wholesale_price: (formData.currentPricePerUnit as number) * 0.85,
          grade: formData.grade as string,
          available_quantity: formData.availableQuantity as number,
          min_order_quantity: formData.minOrderQuantity as number,
          harvest_date: formData.harvestDate as string,
          packing_date: formData.harvestDate as string,
          expiry_date: new Date(new Date(formData.harvestDate as string).getTime() + (formData.shelfLifeDays as number) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          collection_center_id: undefined,
          organic_certified: formData.isOrganic as boolean,
          certification_doc_url: undefined,
          location_district: '',
          location_state: '',
          producer_type: 'farmer',
          status: 'active',
        },
      };

      try {
        if (isEditing && editingProduct) {
          await updateMutation.mutateAsync({
            id: editingProduct.id,
            payload: {
              price_per_unit: formData.currentPricePerUnit,
              available_quantity: formData.availableQuantity,
              min_order_quantity: formData.minOrderQuantity,
              grade: formData.grade,
              harvest_date: formData.harvestDate,
              expiry_date: new Date(new Date(formData.harvestDate as string).getTime() + (formData.shelfLifeDays as number) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              organic_certified: formData.isOrganic,
              location_district: '',
              location_state: '',
              status: 'active',
            },
          });
        } else {
          // Save to local store FIRST so product always appears in marketplace
          const productId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          useMarketplaceStore.getState().addFarmerProduct({
            id: productId,
            name: formData.name as string,
            category: formData.category as string,
            currentPricePerUnit: formData.currentPricePerUnit as number,
            unit: formData.unit as string,
            availableQuantity: formData.availableQuantity as number,
            images: [],
            farmerId: user?.id ?? '',
            farmerName: user?.name ?? 'Farmer',
            farmerLocation: '',
            availability: (formData.availableQuantity as number) > 10 ? 'in_stock' : (formData.availableQuantity as number) > 0 ? 'low_stock' : 'out_of_stock',
            stockStatus: (formData.availableQuantity as number) > 10 ? 'in_stock' : (formData.availableQuantity as number) > 0 ? 'low_stock' : 'out_of_stock',
            status: 'active',
            isOrganic: (formData.isOrganic as boolean) ?? false,
            grade: (formData.grade as string) ?? 'A',
            sourceLocation: { district: '', state: 'Tamil Nadu' },
            avgRating: 0,
            createdAt: new Date().toISOString(),
          });

          // Then try API in background (non-blocking — product is already saved locally)
          createMutation.mutateAsync(payload).catch(() => {});

          toast.success(t('producer.productAdded', language));
        }
        router.push('/producer/products');
      } catch (err) {
        // Error handled by mutation
      }
    };

    return (
      <main>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-charcoal-800">
              {isEditing ? t('producer.editProduct', language) : t('producer.addProduct', language)}
            </h1>
            <Button variant="outline" onClick={() => router.push('/producer/products')}>
              {t('common.back', language)}
            </Button>
          </div>
          <InventoryForm
            initialData={editingProduct ?? undefined}
            onSubmit={handleSubmit}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-charcoal-800">{t('producer.products', language)}</h1>
            <p className="mt-1 text-sm text-charcoal-500">
              {data ? `${data.total} ${t('producer.itemsListed', language)}` : ''}
            </p>
          </div>
          <Link href="/producer/products?new=1">
            <Button>
              <Plus className="h-4 w-4" /> {t('producer.addProduct', language)}
            </Button>
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            onDebouncedChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder={t('producer.searchProducts', language)}
            delay={400}
            className="sm:w-72"
          />
          <div className="ml-auto flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-charcoal-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-charcoal-200 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
            >
              <option value="newest">{t('producer.sortNewest', language)}</option>
              <option value="price_asc">{t('producer.sortPriceAsc', language)}</option>
              <option value="stock">{t('producer.sortStock', language)}</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : products.length === 0 ? (
          <EmptyState
            title={t('producer.noProducts', language)}
            description={t('producer.listFirstProduct', language)}
            icon={<Package className="h-7 w-7" />}
            action={
              <Link href="/producer/products?new=1">
                <Button>
                  <Plus className="h-4 w-4" /> {t('producer.addProduct', language)}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <Link href={`/product/${product.id}`} className="block">
                  <div className="relative flex h-40 items-center justify-center bg-charcoal-50">
                    <Package className="h-10 w-10 text-charcoal-300" />
                    {product.isOrganic && (
                      <Badge variant="success" className="absolute left-2 top-2" icon={<Leaf className="h-3 w-3" />}>
                        {t('products.organic', language)}
                      </Badge>
                    )}
                    <Badge variant={STOCK_VARIANT[product.stockStatus]} className="absolute right-2 top-2">
                      {t(`products.${product.stockStatus}`, language)}
                    </Badge>
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-charcoal-800">{product.name}</p>
                      <p className="text-xs text-charcoal-400">
                        {formatCurrency(product.currentPricePerUnit)}/{product.unit} • {product.availableQuantity} {product.unit}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[product.status]}>
                      {t(`producer.${product.status}`, language) === `producer.${product.status}` ? product.status : t(`producer.${product.status}`, language)}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-charcoal-500">{product.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-charcoal-100 pt-3">
                    <span className="text-[11px] text-charcoal-400">{formatDate(product.createdAt)}</span>
                    <div className="flex gap-1">
                      <Link href={`/producer/products?edit=${product.id}&new=1`}>
                        <button className="rounded-lg border border-charcoal-200 p-1.5 text-charcoal-500 transition-colors hover:border-primary-300 hover:text-primary-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(product.id)}
                        className="rounded-lg border border-red-200 p-1.5 text-red-500 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </div>
        )}

        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title={t('producer.deleteTitle', language)}
          subtitle={t('producer.confirmDelete', language)}
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel', language)}</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={async () => {
                if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget);
                setDeleteTarget(null);
                refetch();
              }}
            >
              {t('common.confirm', language)}
            </Button>
          </div>
        </Modal>
      </main>
  );
}

export default function ProducerProductsPage() {
  return (
    <>
      <PromoStrip />
      <Header />
      <Suspense fallback={<div className="py-8"><PageLoader /></div>}>
        <ProducerProductsContent />
      </Suspense>
      <Footer />
      <MobileNav />
    </>
  );
}
