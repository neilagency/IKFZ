'use client';

import { Banknote, Lock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';

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
  errors: FieldErrors;
  selectedMethod: string | undefined;
  error?: string;
}

/* ── Brand Icons ─────────────────────────────────────────────────── */
function BrandIcon({ methodId }: { methodId: string }) {
  switch (methodId) {
    case 'paypal':
      return (
        <span className="text-sm font-bold">
          <span className="text-[#003087]">Pay</span>
          <span className="text-[#009cde]">Pal</span>
        </span>
      );
    case 'applepay':
      return <span className="text-sm font-bold text-black"> Pay</span>;
    case 'creditcard':
      return <span className="text-xs font-semibold text-dark-400">Karte</span>;
    case 'sepa':
      return <Banknote className="w-5 h-5 text-dark-400" />;
    case 'klarna':
      return (
        <span className="text-xs font-bold text-[#17120F] bg-[#FFB3C7] px-2 py-0.5 rounded">
          Klarna.
        </span>
      );
    default:
      return null;
  }
}

/* ── Method Descriptions ─────────────────────────────────────────── */
const METHOD_DESCRIPTIONS: Record<string, React.ReactNode> = {
  paypal: (
    <p className="text-sm text-dark-500">
      Zahlen Sie sicher und schnell mit PayPal. Nach Klick auf &bdquo;PayPal Jetzt kaufen&ldquo; werden Sie automatisch zur sicheren PayPal-Zahlung weitergeleitet.
    </p>
  ),
  applepay: (
    <p className="text-sm text-dark-500">
      Bezahlen Sie bequem und sicher mit Apple Pay. Nach Klick auf &bdquo;Mit Apple Pay bezahlen&ldquo; werden Sie zur sicheren Zahlungsseite weitergeleitet.
    </p>
  ),
  creditcard: (
    <div className="space-y-2">
      <p className="text-sm text-dark-500">
        Zahlen Sie sicher per Kredit- oder Debitkarte. Ihre Kartendaten werden verschlüsselt übertragen.
      </p>
      <p className="text-xs text-dark-400 flex items-center gap-1">
        <Lock className="w-3 h-3" /> Sichere Zahlungen bereitgestellt durch <strong>mollie</strong>
      </p>
    </div>
  ),
  sepa: (
    <p className="text-sm text-dark-500">
      Bitte überweisen Sie den Gesamtbetrag auf unser Bankkonto. Die Bearbeitung beginnt nach Zahlungseingang.
    </p>
  ),
  klarna: (
    <div className="space-y-2">
      <p className="text-sm text-dark-500">
        Bezahlen Sie flexibel mit Klarna &ndash; sofort, später oder in Raten.
      </p>
      <p className="text-xs text-dark-400 flex items-center gap-1">
        <Lock className="w-3 h-3" /> Sichere Zahlungen bereitgestellt durch <strong>Klarna</strong> via <strong>mollie</strong>
      </p>
    </div>
  ),
};

/* ── Inline Billing Fields ───────────────────────────────────────── */
function BillingFields({
  methodId,
  register,
  errors,
}: {
  methodId: string;
  register: UseFormRegister<any>;
  errors: FieldErrors;
}) {
  const isKlarna = methodId === 'klarna';

  const fieldClass = (name: string) =>
    cn(
      'w-full px-4 py-3 rounded-xl border border-dark-200 bg-white text-sm outline-none transition-colors',
      'focus:border-primary focus:ring-2 focus:ring-primary/20',
      errors[name] && 'border-red-400 focus:border-red-400 focus:ring-red-200',
    );

  const errorMsg = (name: string) => {
    const err = errors[name];
    if (!err?.message) return null;
    return (
      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {String(err.message)}
      </p>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="pt-4 mt-4 border-t border-dark-100 space-y-4">
        {isKlarna ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-1.5">
                  Vorname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('firstName')}
                  placeholder="Max"
                  className={fieldClass('firstName')}
                />
                {errorMsg('firstName')}
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-1.5">
                  Nachname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('lastName')}
                  placeholder="Mustermann"
                  className={fieldClass('lastName')}
                />
                {errorMsg('lastName')}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-1.5">
                Straße und Hausnr. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('address')}
                placeholder="Musterstraße 1"
                className={fieldClass('address')}
              />
              {errorMsg('address')}
            </div>
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-dark-700 mb-1.5">
                  PLZ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('postcode')}
                  placeholder="45141"
                  maxLength={5}
                  className={fieldClass('postcode')}
                />
                {errorMsg('postcode')}
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-semibold text-dark-700 mb-1.5">
                  Stadt <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('city')}
                  placeholder="Essen"
                  className={fieldClass('city')}
                />
                {errorMsg('city')}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-1.5">
                Telefon <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register('phone')}
                placeholder="+49 152 1234567"
                className={fieldClass('phone')}
              />
              {errorMsg('phone')}
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-1.5">
                E-Mail-Adresse <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="max@beispiel.de"
                className={fieldClass('email')}
              />
              {errorMsg('email')}
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-1.5">
                Name / Firma <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  {...register('firstName')}
                  placeholder="Vorname"
                  className={fieldClass('firstName')}
                />
                <input
                  type="text"
                  {...register('lastName')}
                  placeholder="Nachname"
                  className={fieldClass('lastName')}
                />
              </div>
              {(errorMsg('firstName') || errorMsg('lastName'))}
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-1.5">
                Telefon <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register('phone')}
                placeholder="+49 152 1234567"
                className={fieldClass('phone')}
              />
              {errorMsg('phone')}
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-1.5">
                E-Mail-Adresse <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="max@beispiel.de"
                className={fieldClass('email')}
              />
              {errorMsg('email')}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ── Component ──────────────────────────────────────────────────── */
export function PaymentMethodSelector({
  methods,
  register,
  errors,
  selectedMethod,
  error,
}: PaymentMethodSelectorProps) {
  if (methods.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white border border-dark-100 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/90 px-6 py-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          💳 Zahlungsmethode
        </h2>
        <p className="text-sm text-white/70 mt-0.5">
          Alle Zahlungen sind SSL-verschlüsselt
        </p>
      </div>

      {/* Methods */}
      <div className="p-6 space-y-3">
        {methods.map((method) => {
          const isSelected = selectedMethod === method.id;
          return (
            <div
              key={method.id}
              className={cn(
                'rounded-xl border-2 transition-all',
                isSelected
                  ? 'border-primary bg-primary/[0.03]'
                  : 'border-dark-100 hover:border-dark-200',
              )}
            >
              <label className="flex items-center justify-between p-4 cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    value={method.id}
                    {...register('paymentMethod')}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="font-medium text-dark-700">
                    {method.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {method.fee > 0 ? (
                    <span className="text-xs text-dark-400">
                      + {method.fee.toFixed(2).replace('.', ',')} €
                    </span>
                  ) : (
                    <span className="text-xs text-primary font-medium">
                      Kostenlos
                    </span>
                  )}
                  <BrandIcon methodId={method.id} />
                </div>
              </label>

              {/* Expanded content when selected — description only */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      {METHOD_DESCRIPTIONS[method.id]}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Billing fields rendered ONCE outside the loop to prevent duplicate DOM fields.
            AnimatePresence mode="wait" ensures old fields fully unmount before new ones mount. */}
        <AnimatePresence mode="wait">
          {selectedMethod && (
            <BillingFields
              key={selectedMethod}
              methodId={selectedMethod}
              register={register}
              errors={errors}
            />
          )}
        </AnimatePresence>
      </div>
      {error && (
        <p className="text-red-500 text-sm px-6 pb-4">{error}</p>
      )}
    </div>
  );
}
