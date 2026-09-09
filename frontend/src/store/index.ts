import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Address, CartItem, ServiceArea } from '@/types';

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

export { create as createStore };