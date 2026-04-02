'use client';

import { CreditCard, Landmark, Wallet, Apple, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UseFormRegister } from 'react-hook-form';
import type { LucideIcon } from 'lucide-react';

/* ── Icon map (checkout ID → Lucide component) ────────────────── */
export const PAYMENT_ICONS: Record<string, LucideIcon> = {
  creditcard: CreditCard,
  paypal: Wallet,
  applepay: Apple,
  sepa: Landmark,
  klarna: ShoppingCart,
};

/* ── Types ──────────────────────────────────────────────────────── */
export interface PaymentMethodDef {
  id: string;
  label: string;
  description: string | null;
  fee: number;
  icon: string | null;
}

interface PaymentMethodSelectorProps {
  methods: PaymentMethodDef[];
  register: UseFormRegister<any>;
  selectedMethod: string | undefined;
  error?: string;
}

/* ── Component ──────────────────────────────────────────────────── */
export function PaymentMethodSelector({
  methods,
  register,
  selectedMethod,
  error,
}: PaymentMethodSelectorProps) {
  if (methods.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
      <h2 className="text-lg font-bold text-dark-900 mb-4">
        Zahlungsmethode
      </h2>
      <div className="space-y-3">
        {methods.map((method) => {
          const Icon = PAYMENT_ICONS[method.id] || CreditCard;
          return (
            <label
              key={method.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                selectedMethod === method.id
                  ? 'border-primary bg-primary/[0.04]'
                  : 'border-dark-100 hover:border-dark-200',
              )}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  value={method.id}
                  {...register('paymentMethod')}
                  className="accent-primary w-4 h-4"
                />
                <Icon className="w-5 h-5 text-dark-500" />
                <div className="flex flex-col">
                  <span className="font-medium text-dark-700">
                    {method.label}
                  </span>
                  {method.description && (
                    <span className="text-xs text-dark-400">
                      {method.description}
                    </span>
                  )}
                </div>
              </div>
              {method.fee > 0 ? (
                <span className="text-xs text-dark-400">
                  + {method.fee.toFixed(2).replace('.', ',')} €
                </span>
              ) : (
                <span className="text-xs text-primary font-medium">
                  Kostenlos
                </span>
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
