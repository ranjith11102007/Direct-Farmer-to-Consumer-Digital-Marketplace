'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { apiPost, apiPatch, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { User, UserRole, AuthResponse } from '@/types';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    token,
    isAuthenticated,
    login: setAuth,
    logout: clearAuth,
    setUser,
    setTokens,
  } = useAuthStore();

  const login = useCallback(
    async (payload: { phoneNumber: string; otp?: string; email?: string; password?: string }) => {
      try {
        const res = await apiPost<AuthResponse>('/auth/login', payload);
        setAuth(res.user, res.accessToken, res.refreshToken);
        toast.success('Welcome back!');
        return res;
      } catch (error) {
        toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [setAuth]
  );

  const requestOtp = useCallback(async (phoneNumber: string) => {
    try {
      await apiPost<{ otpSent: boolean }>('/auth/otp/request', { phoneNumber });
      toast.success('OTP sent to your phone');
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  }, []);

  const verifyOtp = useCallback(async (phoneNumber: string, otp: string) => {
    try {
      const res = await apiPost<AuthResponse>('/auth/otp/verify', { phoneNumber, otp });
      setAuth(res.user, res.accessToken, res.refreshToken);
      toast.success('Phone verified successfully');
      return res;
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  }, [setAuth]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await apiPost<AuthResponse>('/auth/login', { email, password });
        setAuth(res.user, res.accessToken, res.refreshToken);
        toast.success('Welcome back!');
        return res;
      } catch (error) {
        toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [setAuth]
  );

  const register = useCallback(
    async (payload: Partial<User> & { role: UserRole; password?: string; otp?: string }) => {
      try {
        const res = await apiPost<AuthResponse>('/auth/register', payload);
        setAuth(res.user, res.accessToken, res.refreshToken);
        toast.success('Account created successfully!');
        return res;
      } catch (error) {
        toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [setAuth]
  );

  const logout = useCallback(() => {
    try {
      const refresh = useAuthStore.getState().refreshToken;
      if (refresh) {
        apiPost('/auth/logout', { refreshToken: refresh }).catch(() => undefined);
      }
    } catch {
      // ignore
    }
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/');
  }, [clearAuth, router]);

  const updateProfile = useCallback(
    async (payload: Partial<User>) => {
      try {
        const res = await apiPatch<{ user: User }>('/auth/me', payload);
        setUser(res.user);
        toast.success('Profile updated');
        return res.user;
      } catch (error) {
        toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [setUser]
  );

  const refreshTokens = useCallback(async () => {
    const refresh = useAuthStore.getState().refreshToken;
    if (!refresh) return false;
    try {
      const res = await apiPost<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        refreshToken: refresh,
      });
      setTokens(res.accessToken, res.refreshToken);
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [setTokens, clearAuth]);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const isFarmer = useMemo(() => user?.role === 'farmer' || user?.role === 'fpo', [user]);
  const isBulkBuyer = useMemo(() => user?.role === 'bulk_buyer', [user]);
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const isDeliveryPartner = useMemo(() => user?.role === 'delivery_partner', [user]);

  return {
    user,
    token,
    isAuthenticated,
    isFarmer,
    isBulkBuyer,
    isAdmin,
    isDeliveryPartner,
    login,
    requestOtp,
    verifyOtp,
    loginWithEmail,
    register,
    logout,
    updateProfile,
    refreshTokens,
    hasRole,
  };
}