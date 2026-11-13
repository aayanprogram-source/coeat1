'use client';

import type { RestaurantRole } from '@datapal/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface MyRestaurant {
  id: string;
  name: string;
  status: 'draft' | 'pending' | 'approved' | 'suspended' | 'rejected';
  role: RestaurantRole;
  review_note: string | null;
  city_id: string;
  logo_path: string | null;
  fee_percent: number;
  merchant_agreement_version: number | null;
}

interface RestaurantContextValue {
  restaurant: MyRestaurant;
  restaurants: MyRestaurant[];
  select: (id: string) => void;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);
const storageKey = 'current-restaurant';

function remembered(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function RestaurantProvider({ restaurants, children }: { restaurants: MyRestaurant[]; children: ReactNode }) {
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentId(remembered());
  }, []);

  const select = useCallback((id: string) => {
    setCurrentId(id);
    try {
      window.localStorage.setItem(storageKey, id);
    } catch {
      // The choice then lasts only for this visit.
    }
  }, []);

  const value = useMemo<RestaurantContextValue>(() => {
    const restaurant = restaurants.find((r) => r.id === currentId) ?? restaurants[0];
    if (!restaurant) throw new Error('RestaurantProvider needs at least one restaurant');
    return { restaurant, restaurants, select };
  }, [currentId, restaurants, select]);

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}

export function useRestaurant(): RestaurantContextValue {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurant must be used inside RestaurantProvider');
  return ctx;
}
