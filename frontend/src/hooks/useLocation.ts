'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocationStore } from '@/store';
import { apiGet, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { isValidPincode } from '@/lib/utils';
import type { Address, ServiceArea } from '@/types';

interface GeoPosition {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const router = useRouter();
  const {
    selectedAddress,
    serviceArea,
    savedAddresses,
    setDestination,
    setServiceArea,
    addAddress,
    removeAddress,
    setDefaultAddress,
  } = useLocationStore();

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<GeoPosition | null>(null);

  const detectLocation = useCallback(async (): Promise<GeoPosition | null> => {
    setIsLocating(true);
    setLocationError(null);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      return await new Promise<GeoPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setCurrentCoords(coords);
            setIsLocating(false);
            resolve(coords);
          },
          (err) => {
            setLocationError(err.message ?? 'Location access denied');
            setIsLocating(false);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }

    setIsLocating(false);
    setLocationError('Geolocation not available in this browser');
    return null;
  }, []);

  const checkServiceAvailability = useCallback(
    async (pincode: string): Promise<ServiceArea | null> => {
      if (!isValidPincode(pincode)) {
        toast.error('Please enter a valid 6-digit pincode');
        return null;
      }
      try {
        const res = await apiGet<{ serviceArea: ServiceArea } | { area: ServiceArea }>(
          `/service-areas/check?pincode=${pincode}`
        );
        const area = 'serviceArea' in res ? res.serviceArea : res.area;
        setServiceArea(area);
        return area;
      } catch (error) {
        setServiceArea(null);
        toast.error(getErrorMessage(error));
        return null;
      }
    },
    [setServiceArea]
  );

  const reverseGeocode = useCallback(async (coords: GeoPosition): Promise<string | null> => {
    try {
      const res = await apiGet<{ address?: string; district?: string; pincode?: string }>(
        `/geocode/reverse?lat=${coords.latitude}&lng=${coords.longitude}`
      );
      return (res.address ?? `${res.district ?? ''}`.trim()) || null;
    } catch {
      return null;
    }
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    const coords = await detectLocation();
    if (!coords) return null;

    const geoAddress = await reverseGeocode(coords);
    const tempAddress: Address = {
      id: `gps-${Date.now()}`,
      label: 'Current Location',
      addressLine1: geoAddress ?? 'GPS location',
      city: '',
      district: '',
      state: '',
      pincode: '',
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
    setDestination(tempAddress);
    return tempAddress;
  }, [detectLocation, reverseGeocode, setDestination]);

  const selectAddress = useCallback(
    (address: Address) => {
      setDestination(address);
      if (address.pincode) {
        void checkServiceAvailability(address.pincode);
      }
    },
    [setDestination, checkServiceAvailability]
  );

  const saveAddress = useCallback(
    (address: Address) => {
      addAddress(address);
      setDestination(address);
      if (address.pincode) {
        void checkServiceAvailability(address.pincode);
      }
      toast.success('Address saved');
    },
    [addAddress, setDestination, checkServiceAvailability]
  );

  const pickFromMap = useCallback(
    async (lat: number, lng: number) => {
      setIsLocating(true);
      setCurrentCoords({ latitude: lat, longitude: lng });
      const geoAddress = await reverseGeocode({ latitude: lat, longitude: lng });
      const address: Address = {
        id: `map-${Date.now()}`,
        label: 'Pinned location',
        addressLine1: geoAddress ?? 'Pinned location',
        city: '',
        district: geoAddress ?? '',
        state: '',
        pincode: '',
        latitude: lat,
        longitude: lng,
      };
      setDestination(address);
      setIsLocating(false);
      return address;
    },
    [reverseGeocode, setDestination]
  );

  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddress) {
      const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      setDestination(def);
    }
  }, [savedAddresses, selectedAddress, setDestination]);

  return {
    selectedAddress,
    serviceArea,
    savedAddresses,
    isLocating,
    locationError,
    currentCoords,
    detectLocation,
    handleUseCurrentLocation,
    checkServiceAvailability,
    selectAddress,
    saveAddress,
    removeAddress,
    setDefaultAddress,
    pickFromMap,
  };
}

export function getDefaultAddress(): Address | null {
  return useLocationStore.getState().selectedAddress;
}