'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

interface CustomerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/* ── Split contexts: State vs Actions ── */

interface CustomerAuthState {
  customer: CustomerUser | null;
  loading: boolean;
  linkedOrders: number;
}

interface CustomerAuthActions {
  clearLinkedOrders: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; linkedOrders?: number }>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<{ success: boolean; error?: string; linkedOrders?: number }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CustomerStateContext = createContext<CustomerAuthState | null>(null);
const CustomerActionsContext = createContext<CustomerAuthActions | null>(null);

type CustomerAuthContextType = CustomerAuthState & CustomerAuthActions;

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedOrders, setLinkedOrders] = useState(0);

  const clearLinkedOrders = useCallback(() => setLinkedOrders(0), []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/customer/session');
      const data = await res.json();
      setCustomer(data.authenticated ? data.customer : null);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      setCustomer(data.customer);
      if (data.linkedOrders > 0) setLinkedOrders(data.linkedOrders);
      return { success: true, linkedOrders: data.linkedOrders || 0 };
    } catch {
      return { success: false, error: 'Ein Fehler ist aufgetreten.' };
    }
  }, []);

  const register = useCallback(async (formData: { email: string; password: string; firstName: string; lastName: string }) => {
    try {
      const res = await fetch('/api/auth/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      setCustomer(data.customer);
      if (data.linkedOrders > 0) setLinkedOrders(data.linkedOrders);
      return { success: true, linkedOrders: data.linkedOrders || 0 };
    } catch {
      return { success: false, error: 'Ein Fehler ist aufgetreten.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/customer/session', { method: 'DELETE' });
    setCustomer(null);
  }, []);

  const state = useMemo<CustomerAuthState>(
    () => ({ customer, loading, linkedOrders }),
    [customer, loading, linkedOrders],
  );

  const actions = useMemo<CustomerAuthActions>(
    () => ({ clearLinkedOrders, login, register, logout, refresh }),
    [clearLinkedOrders, login, register, logout, refresh],
  );

  return (
    <CustomerActionsContext.Provider value={actions}>
      <CustomerStateContext.Provider value={state}>
        {children}
      </CustomerStateContext.Provider>
    </CustomerActionsContext.Provider>
  );
}

export function useCustomerActions() {
  const ctx = useContext(CustomerActionsContext);
  if (!ctx) throw new Error('useCustomerActions must be used within CustomerAuthProvider');
  return ctx;
}

export function useCustomerState() {
  const ctx = useContext(CustomerStateContext);
  if (!ctx) throw new Error('useCustomerState must be used within CustomerAuthProvider');
  return ctx;
}

export function useCustomerAuth(): CustomerAuthContextType {
  const state = useCustomerState();
  const actions = useCustomerActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
