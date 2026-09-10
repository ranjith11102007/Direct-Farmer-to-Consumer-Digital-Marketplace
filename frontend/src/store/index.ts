import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Address, CartItem, ServiceArea, Product, Order, Notification } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (token: string, refreshToken?: string) => void;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      login: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true }),
      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'vaikkal-auth' }
  )
);

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  get total(): number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
                ),
        })),
      clearCart: () => set({ items: [] }),
      get total() {
        return get().items.reduce((sum, i) => sum + i.pricePerUnit * i.quantity, 0);
      },
    }),
    { name: 'vaikkal-cart' }
  )
);

interface LocationState {
  selectedAddress: Address | null;
  serviceArea: ServiceArea | null;
  savedAddresses: Address[];
  setDestination: (address: Address | null) => void;
  setServiceArea: (area: ServiceArea | null) => void;
  addAddress: (address: Address) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      selectedAddress: null,
      serviceArea: null,
      savedAddresses: [],
      setDestination: (selectedAddress) => set({ selectedAddress }),
      setServiceArea: (serviceArea) => set({ serviceArea }),
      addAddress: (address) =>
        set((state) => ({ savedAddresses: [...state.savedAddresses, address] })),
      removeAddress: (id) =>
        set((state) => ({
          savedAddresses: state.savedAddresses.filter((a) => a.id !== id),
        })),
      setDefaultAddress: (id) =>
        set((state) => ({
          savedAddresses: state.savedAddresses.map((a) => ({
            ...a,
            isDefault: a.id === id,
          })),
          selectedAddress:
            state.savedAddresses.find((a) => a.id === id) ?? state.selectedAddress,
        })),
    }),
    { name: 'vaikkal-location' }
  )
);

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  language: 'en' | 'ta';
  searchQuery: string;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setLanguage: (language: 'en' | 'ta') => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: false,
      theme: 'light',
      language: 'en',
      searchQuery: '',
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setLanguage: (language) => set({ language }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      get currentLanguage() {
        return get().language;
      },
    }),
    { name: 'vaikkal-ui' }
  )
);

interface FarmerProduct {
  id: string;
  name: string;
  category: string;
  currentPricePerUnit: number;
  unit: string;
  availableQuantity: number;
  images: string[];
  farmerId: string;
  farmerName: string;
  farmerLocation: string;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  status: 'active' | 'inactive' | 'sold_out';
  isOrganic: boolean;
  grade: string;
  sourceLocation: { district: string; state: string; village?: string };
  avgRating: number;
  createdAt: string;
  [key: string]: unknown;
}

interface MarketplaceState {
  farmerProducts: FarmerProduct[];
  addFarmerProduct: (product: FarmerProduct) => void;
  updateFarmerProduct: (id: string, updates: Partial<FarmerProduct>) => void;
  removeFarmerProduct: (id: string) => void;
  getProductsByFarmer: (farmerId: string) => FarmerProduct[];
  getAllActiveProducts: () => FarmerProduct[];
}

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set, get) => ({
      farmerProducts: [],
      addFarmerProduct: (product) =>
        set((state) => ({ farmerProducts: [...state.farmerProducts, product] })),
      updateFarmerProduct: (id, updates) =>
        set((state) => ({
          farmerProducts: state.farmerProducts.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      removeFarmerProduct: (id) =>
        set((state) => ({
          farmerProducts: state.farmerProducts.filter((p) => p.id !== id),
        })),
      getProductsByFarmer: (farmerId) =>
        get().farmerProducts.filter((p) => p.farmerId === farmerId),
      getAllActiveProducts: () =>
        get().farmerProducts.filter((p) => p.status === 'active'),
    }),
    { name: 'vaikkal-marketplace' }
  )
);

interface FarmerOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
}

interface FarmerOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  farmerId: string;
  farmerName: string;
  items: FarmerOrderItem[];
  totalAmount: number;
  deliveryAddress?: string;
  orderStatus: 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

interface OrdersState {
  farmerOrders: FarmerOrder[];
  addFarmerOrder: (order: FarmerOrder) => void;
  updateFarmerOrderStatus: (orderId: string, status: FarmerOrder['orderStatus']) => void;
  getOrdersByFarmer: (farmerId: string) => FarmerOrder[];
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      farmerOrders: [],
      addFarmerOrder: (order) =>
        set((state) => ({ farmerOrders: [...state.farmerOrders, order] })),
      updateFarmerOrderStatus: (orderId, status) =>
        set((state) => ({
          farmerOrders: state.farmerOrders.map((o) =>
            o.id === orderId ? { ...o, orderStatus: status, updatedAt: new Date().toISOString() } : o
          ),
        })),
      getOrdersByFarmer: (farmerId) =>
        get().farmerOrders.filter((o) => o.farmerId === farmerId),
    }),
    { name: 'vaikkal-farmer-orders' }
  )
);

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'product' | 'system' | 'promotion';
  read: boolean;
  link?: string;
  createdAt: string;
  orderId?: string;
  productId?: string;
}

interface NotificationsState {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (userId: string) => void;
  getUnreadCount: (userId: string) => number;
  getNotificationsByUser: (userId: string) => NotificationItem[];
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllAsRead: (userId) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n
          ),
        })),
      getUnreadCount: (userId) =>
        get().notifications.filter((n) => n.userId === userId && !n.read).length,
      getNotificationsByUser: (userId) =>
        get().notifications.filter((n) => n.userId === userId),
    }),
    { name: 'vaikkal-notifications' }
  )
);

export type { FarmerProduct, FarmerOrder, FarmerOrderItem, NotificationItem };

export { create as createStore };