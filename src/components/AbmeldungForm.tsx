'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Phone,
  ArrowRight,
  ArrowLeft,
  Check,
  Car,
  FileText,
  Shield,
  Tag,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Zod Schema for Abmeldung ──
const abmeldungSchema = z.object({
  kennzeichen: z.string().min(1, 'Kennzeichen ist erforderlich'),
  fin: z.string().min(1, 'Fahrgestellnummer ist erforderlich'),
  sicherheitscode: z
    .string()
    .length(7, 'Der Sicherheitscode muss genau 7 Zeichen haben'),
  stadtKreis: z.string().min(1, 'Stadt/Kreis ist erforderlich'),
  codeVorne: z
    .string()
    .length(3, 'Der Code muss genau 3 Zeichen haben'),
  codeHinten: z
    .string()
    .length(3, 'Der Code muss genau 3 Zeichen haben'),
  reservierung: z.enum(['keine', 'einJahr']),
});

type AbmeldungFormData = z.infer<typeof abmeldungSchema>;

const STEPS = [
  { id: 1, label: 'Fahrzeugdaten', icon: Car },
  { id: 2, label: 'Fahrzeugschein', icon: FileText },
  { id: 3, label: 'Kennzeichen', icon: Shield },
  { id: 4, label: 'Reservierung', icon: Tag },
];

const STEP_FIELDS: Record<number, (keyof AbmeldungFormData)[]> = {
  1: ['kennzeichen', 'fin'],
  2: ['sicherheitscode'],
  3: ['stadtKreis', 'codeVorne', 'codeHinten'],
  4: ['reservierung'],
};

interface ServiceFormProps {
  basePrice: number;
  reservierungPrice: number;
  productName: string;
}

export default function ServiceForm({
  basePrice = 19.70,
  reservierungPrice = 4.70,
  productName = 'Fahrzeug Online Abmelden',
}: ServiceFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [showCodeHelp, setShowCodeHelp] = useState(false);
  const [showKennzeichenHelp, setShowKennzeichenHelp] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<AbmeldungFormData>({
    resolver: zodResolver(abmeldungSchema),
    defaultValues: {
      reservierung: 'keine',
    },
  });

  const watchReservierung = watch('reservierung');

  const totalPrice = useMemo(() => {
    let price = basePrice;
    if (watchReservierung === 'einJahr') {
      price += reservierungPrice;
    }
    return price;
  }, [basePrice, reservierungPrice, watchReservierung]);

  const nextStep = useCallback(async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, 4));
  }, [currentStep, trigger]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const onSubmit = useCallback(
    (data: AbmeldungFormData) => {
      // Save to sessionStorage for checkout page
      const orderData = {
        productName,
        productSlug: 'fahrzeugabmeldung',
        serviceType: 'abmeldung',
        formData: data,
        basePrice,
        addons: data.reservierung === 'einJahr'
          ? [{ key: 'reservierung', label: 'Kennzeichenreservierung (1 Jahr)', price: reservierungPrice }]
          : [],
        total: totalPrice,
      };
      sessionStorage.setItem('checkout_order', JSON.stringify(orderData));
      router.push('/rechnung/');
    },
    [productName, basePrice, reservierungPrice, totalPrice, router]
  );

  return (
    <div className="bg-white">
      {/* Help Banner */}
      <div className="flex items-center gap-3 rounded-2xl p-4 mb-8 bg-primary/[0.04] border border-primary/10">
        <Phone className="w-5 h-5 text-primary flex-shrink-0" />
        <span className="text-sm text-dark-600">
          Benötigen Sie Hilfe? Rufen Sie uns an:{' '}
          <a
            href="tel:015224999190"
            className="font-bold text-primary hover:underline"
          >
            ℡ 01522 4999190
          </a>
        </span>
      </div>

      {/* ── Stepper ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            return (
              <div
                key={step.id}
                className="flex items-center flex-1 last:flex-initial"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 text-sm font-bold',
                      isCompleted
                        ? 'bg-primary text-white shadow-[0_4px_12px_rgba(0,168,90,0.3)]'
                        : isActive
                        ? 'bg-primary text-white shadow-[0_4px_16px_rgba(0,168,90,0.35)] ring-4 ring-primary/20'
                        : 'bg-dark-50 text-dark-400 border border-dark-200'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] md:text-xs font-medium mt-2 transition-colors',
                      isActive
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-dark-600'
                        : 'text-dark-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 md:mx-3 h-0.5 rounded-full mt-[-18px] md:mt-[-20px]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isCompleted ? 'bg-primary' : 'bg-dark-100'
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step Content ── */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* ── STEP 1: Fahrzeugdaten ── */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-dark-900">
                    Fahrzeugdaten
                  </h2>
                  <p className="text-dark-500 text-sm mt-1">
                    Geben Sie das aktuelle Kennzeichen und die
                    Fahrzeug-Identifizierungsnummer (FIN) ein.
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Aktuelles Kennzeichen{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('kennzeichen')}
                      placeholder="z.B. E-AB 1234"
                      className={cn(
                        'input-field uppercase',
                        errors.kennzeichen &&
                          'border-red-400 focus:ring-red-400 focus:border-red-400'
                      )}
                    />
                    {errors.kennzeichen && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.kennzeichen.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Fahrzeug-Identifizierungsnummer (FIN){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('fin')}
                      placeholder="17-stellige Fahrgestellnummer"
                      maxLength={17}
                      className={cn(
                        'input-field uppercase',
                        errors.fin &&
                          'border-red-400 focus:ring-red-400 focus:border-red-400'
                      )}
                    />
                    {errors.fin && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.fin.message}
                      </p>
                    )}
                    <p className="text-xs text-dark-400 mt-2">
                      Die FIN finden Sie im Fahrzeugschein (Feld E) oder auf dem
                      Typenschild des Fahrzeugs.
                    </p>
                  </div>
                </div>

                {/* Reference image */}
                <div className="rounded-2xl bg-dark-50 border border-dark-100 p-5">
                  <p className="text-sm font-semibold text-dark-700 mb-3 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    Wo finde ich die FIN?
                  </p>
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-dark-200">
                    <Image
                      src="/uploads/2024/11/WhatsApp-Image-2024-01-06-at-3.21.48-PM.jpeg"
                      alt="Fahrzeugschein mit markierter FIN"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Fahrzeugschein Sicherheitscode ── */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-dark-900">
                    Sicherheitscode Fahrzeugschein
                  </h2>
                  <p className="text-dark-500 text-sm mt-1">
                    Den 7-stelligen Sicherheitscode finden Sie auf der Rückseite
                    Ihres Fahrzeugscheins (Zulassungsbescheinigung Teil I).
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                  <label className="block text-sm font-semibold text-dark-800 mb-2">
                    Sicherheitscode (7 Zeichen){' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('sicherheitscode')}
                    placeholder="z.B. AB12CD3"
                    maxLength={7}
                    className={cn(
                      'input-field uppercase tracking-[0.3em] text-center text-lg font-mono',
                      errors.sicherheitscode &&
                        'border-red-400 focus:ring-red-400 focus:border-red-400'
                    )}
                  />
                  {errors.sicherheitscode && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.sicherheitscode.message}
                    </p>
                  )}
                  <p className="text-xs text-dark-400 mt-2">
                    Den Code finden Sie unter dem freizulegenden Bereich auf der
                    Rückseite des Fahrzeugscheins.
                  </p>
                </div>

                {/* Reference image */}
                <button
                  type="button"
                  onClick={() => setShowCodeHelp(!showCodeHelp)}
                  className="w-full text-left"
                >
                  <div className="rounded-2xl bg-dark-50 border border-dark-100 p-5">
                    <p className="text-sm font-semibold text-dark-700 mb-3 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      Wo finde ich den Sicherheitscode?{' '}
                      <span className="text-xs text-primary">
                        {showCodeHelp ? 'Ausblenden' : 'Anzeigen'}
                      </span>
                    </p>
                    {showCodeHelp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3"
                      >
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-dark-200">
                          <Image
                            src="/uploads/2024/11/SicherheitscodeZB2-e1736860037665.jpg"
                            alt="Fahrzeugschein Rückseite mit markiertem Sicherheitscode"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <p className="text-xs text-dark-500">
                          Kratzen Sie den verdeckten Bereich auf der Rückseite
                          Ihres Fahrzeugscheins frei, um den 7-stelligen Code zu
                          finden.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </button>

                {/* YouTube reference (optional visual) */}
                <div className="rounded-2xl bg-primary/[0.04] border border-primary/10 p-5">
                  <p className="text-sm font-semibold text-dark-700 mb-2">
                    📹 Video-Anleitung
                  </p>
                  <p className="text-xs text-dark-500">
                    Schauen Sie sich unser Erklärvideo an, um den
                    Sicherheitscode schnell zu finden.
                  </p>
                  <a
                    href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-sm text-primary font-semibold hover:underline"
                  >
                    Video ansehen →
                  </a>
                </div>
              </div>
            )}

            {/* ── STEP 3: Kennzeichen Codes ── */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-dark-900">
                    Sicherheitscodes Kennzeichen
                  </h2>
                  <p className="text-dark-500 text-sm mt-1">
                    Die 3-stelligen Codes finden Sie unter den Stempelplaketten
                    auf Ihren Kennzeichen.
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Stadt/Kreis der Zulassung{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('stadtKreis')}
                      placeholder="z.B. Essen"
                      className={cn(
                        'input-field',
                        errors.stadtKreis &&
                          'border-red-400 focus:ring-red-400 focus:border-red-400'
                      )}
                    />
                    {errors.stadtKreis && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.stadtKreis.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-dark-800 mb-2">
                        Code Vorne (3 Zeichen){' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('codeVorne')}
                        placeholder="z.B. A1B"
                        maxLength={3}
                        className={cn(
                          'input-field uppercase tracking-[0.3em] text-center font-mono',
                          errors.codeVorne &&
                            'border-red-400 focus:ring-red-400 focus:border-red-400'
                        )}
                      />
                      {errors.codeVorne && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.codeVorne.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-dark-800 mb-2">
                        Code Hinten (3 Zeichen){' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('codeHinten')}
                        placeholder="z.B. C2D"
                        maxLength={3}
                        className={cn(
                          'input-field uppercase tracking-[0.3em] text-center font-mono',
                          errors.codeHinten &&
                            'border-red-400 focus:ring-red-400 focus:border-red-400'
                        )}
                      />
                      {errors.codeHinten && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.codeHinten.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reference image */}
                <button
                  type="button"
                  onClick={() =>
                    setShowKennzeichenHelp(!showKennzeichenHelp)
                  }
                  className="w-full text-left"
                >
                  <div className="rounded-2xl bg-dark-50 border border-dark-100 p-5">
                    <p className="text-sm font-semibold text-dark-700 mb-3 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      Wo finde ich die Kennzeichen-Codes?{' '}
                      <span className="text-xs text-primary">
                        {showKennzeichenHelp ? 'Ausblenden' : 'Anzeigen'}
                      </span>
                    </p>
                    {showKennzeichenHelp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3"
                      >
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-dark-200">
                          <Image
                            src="/uploads/2025/01/Kennzeichen-mit-QR-Code-800x800.webp"
                            alt="Kennzeichen mit markierten Sicherheitscodes"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <p className="text-xs text-dark-500">
                          Die 3-stelligen Codes befinden sich unter den
                          Stempelplaketten auf der Vorder- und Rückseite Ihrer
                          Kennzeichen.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </button>
              </div>
            )}

            {/* ── STEP 4: Reservierung & Übersicht ── */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-dark-900">
                    Kennzeichenreservierung
                  </h2>
                  <p className="text-dark-500 text-sm mt-1">
                    Optional: Möchten Sie Ihr aktuelles Kennzeichen für ein Jahr
                    reservieren lassen?
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6">
                  <label className="block text-sm font-semibold text-dark-800 mb-3">
                    Kennzeichen reservieren?
                  </label>
                  <div className="space-y-3">
                    <label
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                        watchReservierung === 'keine'
                          ? 'border-primary bg-primary/[0.04] shadow-sm'
                          : 'border-dark-100 hover:border-dark-200 hover:bg-dark-50/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          value="keine"
                          {...register('reservierung')}
                          className="accent-primary w-4 h-4"
                        />
                        <div>
                          <span className="font-semibold text-dark-800 text-sm">
                            Keine Reservierung
                          </span>
                          <p className="text-xs text-dark-400 mt-0.5">
                            Das Kennzeichen wird freigegeben
                          </p>
                        </div>
                      </div>
                      <span className="text-dark-400 text-sm">Inklusive</span>
                    </label>
                    <label
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                        watchReservierung === 'einJahr'
                          ? 'border-primary bg-primary/[0.04] shadow-sm'
                          : 'border-dark-100 hover:border-dark-200 hover:bg-dark-50/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          value="einJahr"
                          {...register('reservierung')}
                          className="accent-primary w-4 h-4"
                        />
                        <div>
                          <span className="font-semibold text-dark-800 text-sm">
                            Kennzeichen für 1 Jahr reservieren
                          </span>
                          <p className="text-xs text-dark-400 mt-0.5">
                            Ihr Kennzeichen wird für 12 Monate reserviert
                          </p>
                        </div>
                      </div>
                      <span className="text-primary font-bold text-sm">
                        + {reservierungPrice.toFixed(2).replace('.', ',')} €
                      </span>
                    </label>
                  </div>
                </div>

                {/* Summary / Price overview */}
                <div className="rounded-2xl bg-white border border-dark-100 shadow-sm divide-y divide-dark-100">
                  <div className="p-5">
                    <h3 className="font-bold text-dark-800 mb-3">
                      Ihre Angaben
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-dark-500">Kennzeichen</span>
                        <span className="text-dark-800 font-medium uppercase">
                          {getValues('kennzeichen') || '–'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-500">FIN</span>
                        <span className="text-dark-800 font-medium uppercase">
                          {getValues('fin') || '–'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-500">
                          Sicherheitscode ZB I
                        </span>
                        <span className="text-dark-800 font-medium uppercase">
                          {getValues('sicherheitscode') || '–'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-500">Stadt/Kreis</span>
                        <span className="text-dark-800 font-medium">
                          {getValues('stadtKreis') || '–'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-500">
                          Codes (vorne/hinten)
                        </span>
                        <span className="text-dark-800 font-medium uppercase">
                          {getValues('codeVorne') || '–'} /{' '}
                          {getValues('codeHinten') || '–'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price summary */}
                <div className="rounded-2xl bg-primary/[0.04] border-2 border-primary/20 p-6">
                  <h3 className="font-bold text-dark-800 mb-4">
                    Kostenübersicht
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-600">{productName}</span>
                      <span className="text-dark-800 font-medium">
                        {basePrice.toFixed(2).replace('.', ',')} €
                      </span>
                    </div>
                    {watchReservierung === 'einJahr' && (
                      <div className="flex justify-between">
                        <span className="text-dark-600">
                          Kennzeichenreservierung (1 Jahr)
                        </span>
                        <span className="text-dark-800 font-medium">
                          {reservierungPrice.toFixed(2).replace('.', ',')} €
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/20">
                    <span className="text-lg font-bold text-dark-900">
                      Gesamtpreis
                    </span>
                    <span className="text-2xl font-black text-primary">
                      {totalPrice.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Navigation Buttons ── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-100">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="btn-secondary py-3 px-6"
            >
              <ArrowLeft className="w-4 h-4" /> Zurück
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 && (
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-dark-400">Aktueller Preis:</span>
              <span className="font-bold text-primary text-lg">
                {totalPrice.toFixed(2).replace('.', ',')} €
              </span>
            </div>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary py-3 px-8"
            >
              Weiter <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="submit" className="btn-primary py-3 px-8">
              Weiter zur Kasse <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
