import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type {
  Product,
  Category,
  Cart,
  Order,
  Forecast,
  Recommendation,
  BulkRequirement,
  FarmerProfile,
  PaginatedResponse,
  ProductListing,
} from '@/types';

export const queryKeys = {
  products: (params?: string) => ['products', params] as const,
  product: (id: string) => ['product', id] as const,
  categories: ['categories'] as const,
  favorites: ['favorites'] as const,
  cart: ['cart'] as const,
  orders: (params?: string) => ['orders', params] as const,
  order: (id: string) => ['order', id] as const,
  forecasts: (params?: string) => ['forecasts', params] as const,
  recommendation: ['recommendations'] as const,
  producer: (id: string) => ['producer-profile', id] as const,
  bulkRequirements: (params?: string) => ['bulk-requirements', params] as const,
};

export function useProducts(params?: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  return useQuery({
    queryKey: queryKeys.products(query),
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<Product>>(`/products${query ? `?${query}` : ''}`);
      return res;
    },
    staleTime: 60_000,
  });
}

export function useInfiniteProducts(params?: Record<string, string | number | boolean | undefined>) {
  return useInfiniteQuery({
    queryKey: ['products-infinite', params],
    queryFn: async ({ pageParam = 1 }) => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(pageParam));
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value));
          }
        });
      }
      const res = await apiGet<PaginatedResponse<Product>>(`/products?${searchParams.toString()}`);
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: async () => {
      const res = await apiGet<{ product: Product; recommendations: Recommendation[]; reviews: unknown[] }>(`/products/${id}`);
      return res;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const res = await apiGet<Category[] | PaginatedResponse<Category>>('/categories');
      return Array.isArray(res) ? res : res.items;
    },
    staleTime: 10 * 60_000,
  });
}

export function useSearch(query: string, params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ['search', query, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (query) searchParams.set('q', query);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value));
          }
        });
      }
      const res = await apiGet<PaginatedResponse<Product>>(`/products/search?${searchParams.toString()}`);
      return res;
    },
    enabled: Boolean(query && query.length >= 2),
    staleTime: 30_000,
  });
}

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart,
    queryFn: async () => {
      const res = await apiGet<Cart>('/cart');
      return res;
    },
    staleTime: 30_000,
  });
}

export function useUpdateCart(productId: string, quantity: number, successMessage?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiPatch<Cart>(`/cart/items/${productId}`, { quantity });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products('') });
      if (successMessage) toast.success(successMessage);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useOrders(params?: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  return useQuery({
    queryKey: queryKeys.orders(query),
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<Order>>(`/orders${query ? `?${query}` : ''}`);
      return res;
    },
    staleTime: 30_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: async () => {
      const res = await apiGet<{ order: Order }>(`/orders/${id}`);
      return res.order;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      items: Array<{ productId: string; quantity: number; unit?: string; pricePerUnit?: number }>;
      deliveryAddress: Record<string, unknown>;
      deliverySlot?: { time?: string };
      paymentMethod?: string;
      idempotencyKey?: string;
    }) => {
      // 1. Sync cart items to the backend cart (skip local-only demo products).
      const realItems = payload.items.filter((item) => !item.productId.startsWith('local-'));
      for (const item of realItems) {
        await apiPost<{ id: string }>('/orders/cart/items', {
          product_listing_id: item.productId,
          quantity: item.quantity,
        }).catch(() => {
          // Item may no longer be listed; let checkout report the real error.
        });
      }

      // 2. Run checkout against the backend.
      const res = await apiPost<{
        order?: Order;
        payment?: { id?: string };
        message?: string;
      }>('/orders/checkout', {
        delivery_address_json: payload.deliveryAddress,
        payment_method: payload.paymentMethod ?? 'upi',
        notes: payload.deliverySlot?.time ? `Delivery slot: ${payload.deliverySlot.time}` : undefined,
        idempotency_key: payload.idempotencyKey ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      // 3. For pre-paid methods (UPI/card/netbanking/wallet), complete the payment.
      const paymentId = res.payment?.id ?? (res as { payment?: string }).payment as string | undefined;
      if (paymentId && payload.paymentMethod && payload.paymentMethod !== 'cod') {
        await apiPost<{ id: string }>('/orders/payment/complete', {
          payment_id: paymentId,
          provider_reference: `mock-${Date.now()}`,
        }).catch(() => {});
      }

      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiPost<Order>(`/orders/${id}/cancel`, { reason });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      toast.success('Order cancelled successfully');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useForecasts(params?: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  return useQuery({
    queryKey: queryKeys.forecasts(query),
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<Forecast> | Forecast[]>(`/forecasts${query ? `?${query}` : ''}`);
      return Array.isArray(res) ? res : res.items;
    },
    staleTime: 5 * 60_000,
  });
}

export function useRecommendations() {
  return useQuery({
    queryKey: queryKeys.recommendation,
    queryFn: async () => {
      const res = await apiGet<Recommendation[] | PaginatedResponse<Recommendation>>('/recommendations');
      return Array.isArray(res) ? res : res.items;
    },
    staleTime: 5 * 60_000,
  });
}

export function useProducerProfile(id?: string) {
  const validId = id ?? undefined;
  return useQuery({
    queryKey: queryKeys.producer(validId ?? 'me'),
    queryFn: async () => {
      const url = validId ? `/producers/${validId}` : '/producers/me';
      const res = await apiGet<{ profile: FarmerProfile & { id: string } }>(url);
      return res.profile;
    },
    staleTime: 5 * 60_000,
  });
}

export function useBulkRequirements(params?: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  return useQuery({
    queryKey: queryKeys.bulkRequirements(query),
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<BulkRequirement> | BulkRequirement[]>(`/bulk/requirements${query ? `?${query}` : ''}`);
      return Array.isArray(res) ? res : res.items;
    },
    staleTime: 2 * 60_000,
  });
}

export function useCreateBulkRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await apiPost<BulkRequirement>('/bulk/requirements', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bulkRequirements() });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteMutation(
  key: string,
  url: string,
  successMessage?: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiDelete(`${url}/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] });
      if (successMessage) toast.success(successMessage);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      product: {
        name: string;
        name_tamil?: string;
        category_id?: string;
        category_slug?: string;
        description?: string;
        image_url?: string;
        unit?: string;
      };
      listing: {
        price_per_unit: number;
        wholesale_price?: number;
        grade: string;
        available_quantity: number;
        min_order_quantity: number;
        harvest_date?: string;
        packing_date?: string;
        expiry_date?: string;
        collection_center_id?: string;
        organic_certified: boolean;
        certification_doc_url?: string;
        location_district?: string;
        location_state?: string;
        producer_type: string;
        status: string;
      };
    }) => {
      // First create the product
      const productRes = await apiPost<Product>('/products', data.product);
      // Then create the listing
      const listingRes = await apiPost<ProductListing>('/products/listings', {
        ...data.listing,
        product_id: productRes.id,
      });
      return { product: productRes, listing: listingRes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products('') });
      toast.success('Product created successfully');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; payload: Record<string, unknown> }) => {
      const res = await apiPatch<{ id: string }>(`/products/${data.id}`, data.payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products('') });
      toast.success('Product updated successfully');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}