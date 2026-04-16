'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Car,
  FileText,
  Shield,
  Tag,
  HelpCircle,
  CheckCircle2,
  Truck,
  Bike,
  CircleHelp,
  PlayCircle,
  Phone,
  MessageCircle,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import KennzeichenInput from '@/components/KennzeichenInput';

// ── External Media ──────────────────────────────────────────────
const SCHEIN_VIDEO_URL = 'https://www.youtube.com/watch?v=u38keaF1QKU';
const KENNZEICHEN_VIDEO_URL = 'https://www.youtube.com/watch?v=3nsdJSvKAtE';
const TEIL1_VORDERSEITE_IMAGE =
  'https://ikfzdigitalzulassung.de/uploads/2025/01/32128159-zulassungsbescheinigung-teil-1-fahrzeugschein-2hkTzK1Qt8fe.jpg';
const TEIL1_RUECKSEITE_IMAGE =
  'https://ikfzdigitalzulassung.de/uploads/2024/11/WhatsApp-Image-2024-01-06-at-3.21.48-PM-2.jpeg';
const KENNZEICHEN_CODE_IMAGE =
  'https://ikfzdigitalzulassung.de/uploads/2024/10/j-1536x863.png';

// ── Zod Schema ──────────────────────────────────────────────────
const serviceFormSchema = z
  .object({
    fahrzeugTyp: z.enum(
      ['auto', 'motorrad', 'anhaenger', 'leichtkraftrad', 'lkw', 'andere'],
      { required_error: 'Bitte wählen Sie einen Fahrzeugtyp aus' }
    ),
    kennzeichen: z.string().min(1, 'Bitte geben Sie Ihr Kennzeichen ein'),
    fin: z
      .string()
      .min(1, 'Bitte geben Sie die FIN ein')
      .regex(
        /^[A-HJ-NPR-Z0-9]{17}$/i,
        'Die FIN muss genau 17 Zeichen lang sein (keine I, O, Q)'
      ),
    sicherheitscode: z
      .string()
      .min(1, 'Bitte geben Sie den Sicherheitscode ein')
      .length(7, 'Der Sicherheitscode muss genau 7 Zeichen lang sein'),
    stadtKreis: z.string().min(1, 'Bitte geben Sie die Stadt / den Kreis ein'),
    codeVorne: z.string().optional(),
    codeHinten: z
      .string()
      .min(1, 'Bitte geben Sie den Code ein')
      .length(3, 'Der Code muss genau 3 Zeichen lang sein'),
    reservierung: z.enum(['keine', 'einJahr']),
  })
  .superRefine((data, ctx) => {
    const onePlate = ['motorrad', 'anhaenger', 'leichtkraftrad'].includes(
      data.fahrzeugTyp
    );
    if (!onePlate && (!data.codeVorne || data.codeVorne.trim().length !== 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codeVorne'],
        message: 'Der Code muss genau 3 Zeichen lang sein',
      });
    }
  });

type FormData = z.infer<typeof serviceFormSchema>;

// ── Constants ───────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Fahrzeugdaten' },
  { id: 2, label: 'Fahrzeugschein' },
  { id: 3, label: 'Kennzeichen-Codes' },
  { id: 4, label: 'Reservierung' },
];

const VEHICLE_TYPES = [
  { value: 'auto', label: 'Auto', icon: Car },
  { value: 'motorrad', label: 'Motorrad', icon: Bike },
  { value: 'anhaenger', label: 'Anhänger', icon: Truck },
  { value: 'leichtkraftrad', label: 'Leichtkraftrad', icon: Bike },
  { value: 'lkw', label: 'LKW', icon: Truck },
  { value: 'andere', label: 'Andere', icon: CircleHelp },
] as const;

const formatPrice = (v: number) => `${v.toFixed(2).replace('.', ',')} €`;

// ── Sub-components ──────────────────────────────────────────────

function MediaHelpCard({
  title,
  videoUrl,
  imageUrl,
  imageAlt,
}: {
  title: string;
  videoUrl: string;
  imageUrl: string;
  imageAlt: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <HelpCircle className="h-4 w-4 text-emerald-400" />
          {title}
        </p>
      </div>
      <div className="p-5">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500/15"
        >
          <PlayCircle className="h-4 w-4" />
          Video-Anleitung ansehen
        </a>
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-white">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function FormErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-4 flex items-center gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
      <p className="flex-1 text-sm font-medium text-red-200">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-300 hover:text-white"
      >
        ✕
      </button>
    </motion.div>
  );
}

// ── Props ───────────────────────────────────────────────────────
export interface ServiceFormProps {
  basePrice: number;
  reservierungPrice: number;
  settingsPhone: string;
  settingsPhoneLink: string;
  settingsWhatsApp: string;
  settingsEmail: string;
}

// ── ServiceForm Component ───────────────────────────────────────
export default function ServiceForm({
  basePrice,
  reservierungPrice,
  settingsPhone,
  settingsPhoneLink,
  settingsWhatsApp,
  settingsEmail,
}: ServiceFormProps) {
  const router = useRouter();
  const stepTopRef = useRef<HTMLDivElement | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [step4Visited, setStep4Visited] = useState(false);
  const [showCodeHelp, setShowCodeHelp] = useState(true);
  const [showKennzeichenHelp, setShowKennzeichenHelp] = useState(true);
  const [showFormError, setShowFormError] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      fahrzeugTyp: 'auto',
      kennzeichen: '',
      fin: '',
      sicherheitscode: '',
      stadtKreis: '',
      codeVorne: '',
      codeHinten: '',
      reservierung: 'keine',
    },
  });

  const watchReservierung = watch('reservierung');
  const watchFahrzeugTyp = watch('fahrzeugTyp');

  const onePlateVehicle =
    watchFahrzeugTyp === 'motorrad' ||
    watchFahrzeugTyp === 'anhaenger' ||
    watchFahrzeugTyp === 'leichtkraftrad';

  const totalPrice = useMemo(() => {
    let price = basePrice;
    if (watchReservierung === 'einJahr') price += reservierungPrice;
    return price;
  }, [basePrice, reservierungPrice, watchReservierung]);

  // ── Scroll to top on step change ──
  const scrollToTop = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        stepTopRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 80);
    });
  }, []);

  useEffect(() => {
    scrollToTop();
  }, [currentStep, scrollToTop]);

  // Mark step 4 as visited
  useEffect(() => {
    if (currentStep === 4) setStep4Visited(true);
  }, [currentStep]);

  // ── Step validation ──
  const validateCurrentStep = useCallback(async () => {
    setShowFormError(false);
    let valid = true;

    if (currentStep === 1) {
      const ok = await trigger(['fahrzeugTyp', 'kennzeichen', 'fin']);
      if (!ok) valid = false;
    }

    if (currentStep === 2) {
      const ok = await trigger(['sicherheitscode', 'stadtKreis']);
      if (!ok) valid = false;
    }

    if (currentStep === 3) {
      if (onePlateVehicle) {
        const ok = await trigger(['codeHinten']);
        if (!ok) valid = false;
      } else {
        const ok = await trigger(['codeVorne', 'codeHinten']);
        if (!ok) valid = false;
      }
    }

    if (currentStep === 4) {
      const ok = await trigger(['reservierung']);
      if (!ok) valid = false;
    }

    if (!valid) {
      setShowFormError(true);
      scrollToTop();
    }

    return valid;
  }, [currentStep, onePlateVehicle, scrollToTop, trigger]);

  const nextStep = useCallback(async () => {
    const valid = await validateCurrentStep();
    if (!valid) return;
    setCurrentStep((s) => Math.min(s + 1, 4));
  }, [validateCurrentStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  // ── Submit ──
  const onSubmit = useCallback(
    (data: FormData) => {
      if (currentStep !== 4 || !step4Visited) return;

      const totalPriceVal =
        basePrice + (data.reservierung === 'einJahr' ? reservierungPrice : 0);

      // Report-compatible format
      sessionStorage.setItem(
        'serviceData',
        JSON.stringify({
          ...data,
          productSlug: 'fahrzeugabmeldung',
          productName: 'Fahrzeugabmeldung',
          productPrice: totalPriceVal,
          basePrice,
          reservierungPrice:
            data.reservierung === 'einJahr' ? reservierungPrice : 0,
          reservierung: data.reservierung,
        })
      );

      // Checkout page compatible format
      sessionStorage.setItem(
        'checkout_order',
        JSON.stringify({
          productName: 'Fahrzeugabmeldung',
          productSlug: 'fahrzeugabmeldung',
          serviceType: 'abmeldung',
          formData: data,
          basePrice,
          addons:
            data.reservierung === 'einJahr'
              ? [
                  {
                    key: 'reservierung',
                    label: 'Kennzeichenreservierung (1 Jahr)',
                    price: reservierungPrice,
                  },
                ]
              : [],
          total: totalPriceVal,
        })
      );

      router.push('/rechnung/');
    },
    [basePrice, currentStep, reservierungPrice, router, step4Visited]
  );

  // ── Helper: input field class ──
  const inputClass = (fieldName: keyof FormData) =>
    cn(
      'w-full rounded-2xl border bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500',
      errors[fieldName]
        ? 'border-red-400 focus:border-red-400'
        : 'border-white/10 focus:border-emerald-400'
    );

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#050816] px-3 pt-24 pb-6 md:px-5 md:pt-32 md:pb-10 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_26%),linear-gradient(180deg,#0A1020_0%,#060B16_100%)] shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
          <div className="p-4 md:p-6 lg:p-8">
            <div ref={stepTopRef} />

            {/* ── Header ── */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Shield className="h-3.5 w-3.5" />
                Digitaler Abmeldeservice
              </div>
              <h1 className="mt-3 text-xl font-black text-white sm:text-2xl md:text-3xl">
                Fahrzeug online abmelden
              </h1>
              <p className="mt-1.5 text-sm text-zinc-400">
                Einfach, sicher und Schritt für Schritt.
              </p>
            </div>

            {/* ── Step Indicator ── */}
            <div className="mb-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 md:p-4">
              <div className="flex items-center justify-between gap-1.5 overflow-x-auto">
                {STEPS.map((step, i) => {
                  const isCompleted = currentStep > step.id;
                  const isActive = currentStep === step.id;
                  return (
                    <div
                      key={step.id}
                      className="flex min-w-0 flex-1 items-center last:flex-initial sm:min-w-max"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all sm:h-9 sm:w-9 md:h-10 md:w-10',
                            isCompleted
                              ? 'border-emerald-400 bg-emerald-500 text-white'
                              : isActive
                              ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]'
                              : 'border-white/10 bg-white/[0.04] text-zinc-500'
                          )}
                        >
                          {isCompleted ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            step.id
                          )}
                        </div>
                        <span
                          className={cn(
                            'mt-1.5 hidden text-[10px] font-medium sm:block md:text-xs',
                            isActive
                              ? 'text-emerald-400'
                              : isCompleted
                              ? 'text-zinc-200'
                              : 'text-zinc-500'
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="mx-1 h-px flex-1 bg-white/10 sm:mx-2 md:mx-3">
                          <div
                            className={cn(
                              'h-px transition-all duration-300',
                              isCompleted
                                ? 'w-full bg-emerald-400'
                                : 'w-0 bg-transparent'
                            )}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Error Banner ── */}
            <AnimatePresence>
              {showFormError && Object.keys(errors).length > 0 && (
                <FormErrorBanner
                  message="Bitte überprüfen Sie Ihre Eingaben."
                  onDismiss={() => {
                    setShowFormError(false);
                    clearErrors();
                  }}
                />
              )}
            </AnimatePresence>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.22 }}
                >
                  {/* ════════════ STEP 1: Fahrzeugdaten ════════════ */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <div className="text-sm font-semibold text-emerald-400">
                          Schritt 1 von 4
                        </div>
                        <h2 className="mt-1 text-2xl font-black text-white">
                          Fahrzeugdaten
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400">
                          (Pflichtangaben)
                        </p>
                      </div>

                      {/* Vehicle type selector */}
                      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                        <h3 className="mb-4 text-base font-bold text-white">
                          Fahrzeugtyp wählen
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {VEHICLE_TYPES.map((item) => {
                            const Icon = item.icon;
                            const active = watchFahrzeugTyp === item.value;
                            return (
                              <label
                                key={item.value}
                                className={cn(
                                  'cursor-pointer rounded-2xl border p-4 transition-all',
                                  active
                                    ? 'border-emerald-400 bg-emerald-500/10'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                )}
                              >
                                <input
                                  type="radio"
                                  className="hidden"
                                  value={item.value}
                                  {...register('fahrzeugTyp')}
                                />
                                <div className="flex flex-col items-center justify-center gap-3 text-center">
                                  <div
                                    className={cn(
                                      'rounded-2xl p-3',
                                      active
                                        ? 'bg-emerald-500/15'
                                        : 'bg-white/[0.04]'
                                    )}
                                  >
                                    <Icon
                                      className={cn(
                                        'h-7 w-7',
                                        active
                                          ? 'text-emerald-400'
                                          : 'text-zinc-400'
                                      )}
                                    />
                                  </div>
                                  <span
                                    className={cn(
                                      'text-sm font-bold',
                                      active ? 'text-white' : 'text-zinc-300'
                                    )}
                                  >
                                    {item.label}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Kennzeichen + FIN */}
                      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="space-y-5">
                          {/* Kennzeichen */}
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-white">
                              Kennzeichen eintragen{' '}
                              <span className="text-red-400">*</span>
                            </label>
                            <KennzeichenInput
                              value={watch('kennzeichen') || ''}
                              onChange={(v) =>
                                setValue(
                                  'kennzeichen',
                                  (v || '').toUpperCase(),
                                  {
                                    shouldValidate: !!errors.kennzeichen,
                                  }
                                )
                              }
                              error={errors.kennzeichen?.message}
                            />
                            <p className="mt-2 text-xs text-zinc-400">
                              Bei E-, H- oder Saisonkennzeichen bitte nur das
                              normale Kennzeichen eintragen.
                            </p>
                          </div>

                          {/* FIN */}
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-white">
                              FIN (Fahrzeug-Identifizierungsnummer){' '}
                              <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              {...register('fin', {
                                onChange: (e) => {
                                  e.target.value =
                                    e.target.value.toUpperCase();
                                },
                              })}
                              placeholder="z.B. WBA12345678901234"
                              maxLength={17}
                              className={cn(inputClass('fin'), 'font-mono')}
                            />
                            {errors.fin && (
                              <p className="mt-1 text-sm text-red-400">
                                {errors.fin.message}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-zinc-400">
                              Die FIN finden Sie im Fahrzeugschein (Feld E) oder
                              auf dem Typenschild.
                            </p>
                          </div>
                        </div>
                      </div>

                      <MediaHelpCard
                        title="Wo finde ich die FIN?"
                        videoUrl={SCHEIN_VIDEO_URL}
                        imageUrl={TEIL1_VORDERSEITE_IMAGE}
                        imageAlt="Fahrzeugschein Vorderseite mit FIN"
                      />
                    </div>
                  )}

                  {/* ════════════ STEP 2: Fahrzeugschein-Code ════════════ */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <div className="text-sm font-semibold text-emerald-400">
                          Schritt 2 von 4
                        </div>
                        <h2 className="mt-1 text-2xl font-black text-white">
                          Fahrzeugschein-Code
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400">
                          (Sicherheitscode eingeben)
                        </p>
                      </div>

                      {/* Info box */}
                      <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
                        <div className="text-sm font-semibold text-amber-100">
                          Sicherheitscode vom Fahrzeugschein
                        </div>
                        <p className="mt-2 text-sm leading-6 text-amber-50">
                          Den Sicherheitscode finden Sie oben rechts auf der
                          Vorderseite Ihres Fahrzeugscheins
                          (Zulassungsbescheinigung Teil I). Bitte achten Sie auf
                          die genaue Schreibweise.
                        </p>
                      </div>

                      {/* Fields */}
                      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
                        {/* Sicherheitscode */}
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-white">
                            Sicherheitscode (7 Zeichen){' '}
                            <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            {...register('sicherheitscode')}
                            placeholder="z.B. AB12345"
                            maxLength={7}
                            className={cn(
                              inputClass('sicherheitscode'),
                              'font-mono'
                            )}
                          />
                          {errors.sicherheitscode && (
                            <p className="mt-1 text-sm text-red-400">
                              {errors.sicherheitscode.message}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-zinc-400">
                            Bitte Groß- und Kleinschreibung genau übernehmen.
                          </p>
                        </div>

                        {/* Stadt / Kreis */}
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-white">
                            Zulassende Stadt / Kreis{' '}
                            <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            {...register('stadtKreis')}
                            placeholder="z.B. Essen"
                            className={inputClass('stadtKreis')}
                          />
                          {errors.stadtKreis && (
                            <p className="mt-1 text-sm text-red-400">
                              {errors.stadtKreis.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Collapsible help */}
                      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                        <button
                          type="button"
                          onClick={() => setShowCodeHelp((v) => !v)}
                          className="flex w-full items-center justify-between border-b border-white/10 px-5 py-4 text-left"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-white">
                            <HelpCircle className="h-4 w-4 text-emerald-400" />
                            Anleitung zum Freilegen des Codes
                          </span>
                          <span className="text-xs font-semibold text-emerald-400">
                            {showCodeHelp ? 'Ausblenden' : 'Anzeigen'}
                          </span>
                        </button>
                        {showCodeHelp && (
                          <div className="p-5">
                            <a
                              href={SCHEIN_VIDEO_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500/15"
                            >
                              <PlayCircle className="h-4 w-4" />
                              Video-Anleitung ansehen
                            </a>
                            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-white">
                              <Image
                                src={TEIL1_RUECKSEITE_IMAGE}
                                alt="Sicherheitscode auf dem Fahrzeugschein"
                                fill
                                sizes="(max-width: 768px) 100vw, 900px"
                                className="object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ════════════ STEP 3: Kennzeichen-Codes ════════════ */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <div className="text-sm font-semibold text-emerald-400">
                          Schritt 3 von 4
                        </div>
                        <h2 className="mt-1 text-2xl font-black text-white">
                          Kennzeichen-Codes
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400">
                          (Plakettencodes)
                        </p>
                      </div>

                      {/* Info box */}
                      <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
                        <div className="text-sm font-semibold text-amber-100">
                          3-stelliger Code vom Kennzeichen
                        </div>
                        <p className="mt-2 text-sm leading-6 text-amber-50">
                          Den Code finden Sie unter der Plakette auf Ihrem
                          Kennzeichen. Kratzen Sie vorsichtig die Plakette ab,
                          um den 3-stelligen Code freizulegen.
                        </p>
                      </div>

                      {/* Code inputs */}
                      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          {!onePlateVehicle && (
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-white">
                                Code vorne (3 Zeichen){' '}
                                <span className="text-red-400">*</span>
                              </label>
                              <input
                                type="text"
                                {...register('codeVorne')}
                                placeholder="z.B. ja4"
                                maxLength={3}
                                className={inputClass('codeVorne')}
                              />
                              {errors.codeVorne && (
                                <p className="mt-1 text-sm text-red-400">
                                  {errors.codeVorne.message}
                                </p>
                              )}
                            </div>
                          )}
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-white">
                              {onePlateVehicle
                                ? 'Code vom Kennzeichen (3 Zeichen)'
                                : 'Code hinten (3 Zeichen)'}{' '}
                              <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              {...register('codeHinten')}
                              placeholder="z.B. a1B"
                              maxLength={3}
                              className={inputClass('codeHinten')}
                            />
                            {errors.codeHinten && (
                              <p className="mt-1 text-sm text-red-400">
                                {errors.codeHinten.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Collapsible help */}
                      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                        <button
                          type="button"
                          onClick={() => setShowKennzeichenHelp((v) => !v)}
                          className="flex w-full items-center justify-between border-b border-white/10 px-5 py-4 text-left"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-white">
                            <HelpCircle className="h-4 w-4 text-emerald-400" />
                            Anleitung zum Entfernen der Plakette
                          </span>
                          <span className="text-xs font-semibold text-emerald-400">
                            {showKennzeichenHelp ? 'Ausblenden' : 'Anzeigen'}
                          </span>
                        </button>
                        {showKennzeichenHelp && (
                          <div className="p-5">
                            <a
                              href={KENNZEICHEN_VIDEO_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500/15"
                            >
                              <PlayCircle className="h-4 w-4" />
                              Video-Anleitung ansehen
                            </a>
                            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-white">
                              <Image
                                src={KENNZEICHEN_CODE_IMAGE}
                                alt="Kennzeichen Sicherheitscode freilegen"
                                fill
                                sizes="(max-width: 768px) 100vw, 900px"
                                className="object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ════════════ STEP 4: Reservierung ════════════ */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div>
                        <div className="text-sm font-semibold text-emerald-400">
                          Schritt 4 von 4
                        </div>
                        <h2 className="mt-1 text-2xl font-black text-white">
                          Kennzeichenreservierung
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400">
                          (Optional)
                        </p>
                      </div>

                      {/* Reservation options */}
                      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                        <label className="mb-4 block text-sm font-semibold text-white">
                          Kennzeichen reservieren?
                        </label>

                        <div className="space-y-3">
                          {/* Option 1: Keine Reservierung */}
                          <label
                            className={cn(
                              'flex cursor-pointer items-start justify-between rounded-2xl border p-4 transition-all',
                              watchReservierung === 'keine'
                                ? 'border-emerald-400 bg-emerald-500/10'
                                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                value="keine"
                                {...register('reservierung')}
                                className="mt-1 accent-emerald-500"
                              />
                              <div>
                                <span className="text-sm font-semibold text-white">
                                  Nein, ich möchte nicht reservieren
                                </span>
                                <p className="mt-1 text-xs text-zinc-400">
                                  Das Kennzeichen wird nach der Abmeldung
                                  freigegeben.
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">
                              Kostenlos
                            </span>
                          </label>

                          {/* Option 2: 1 Jahr reservieren */}
                          <label
                            className={cn(
                              'flex cursor-pointer items-start justify-between rounded-2xl border p-4 transition-all',
                              watchReservierung === 'einJahr'
                                ? 'border-emerald-400 bg-emerald-500/10'
                                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                value="einJahr"
                                {...register('reservierung')}
                                className="mt-1 accent-emerald-500"
                              />
                              <div>
                                <span className="text-sm font-semibold text-white">
                                  Ja, ich möchte mein Kennzeichen für 1 Jahr
                                  reservieren
                                </span>
                                <p className="mt-1 text-xs text-zinc-400">
                                  Das Kennzeichen bleibt für 12 Monate reserviert
                                  und kann bei einer Neuanmeldung wiederverwendet
                                  werden.
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                              +{formatPrice(reservierungPrice)}
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Price breakdown */}
                      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-300">
                              Fahrzeugabmeldung
                            </span>
                            <span className="font-medium text-white">
                              {formatPrice(basePrice)}
                            </span>
                          </div>
                          {watchReservierung === 'einJahr' && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-zinc-300">
                                Kennzeichenreservierung
                              </span>
                              <span className="font-medium text-white">
                                {formatPrice(reservierungPrice)}
                              </span>
                            </div>
                          )}
                          <div className="border-t border-white/10 pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-white">
                                Gesamtpreis
                              </span>
                              <span className="text-3xl font-black text-emerald-400">
                                {formatPrice(totalPrice)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact help */}
                      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-100">
                          <CheckCircle2 className="h-4 w-4" />
                          Wenn Sie Fragen haben
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <a
                            href={settingsPhoneLink}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-bold text-[#0b1120] hover:opacity-90"
                          >
                            <Phone className="h-4 w-4" />
                            {settingsPhone}
                          </a>
                          <a
                            href={settingsWhatsApp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-400"
                          >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp Support
                          </a>
                          <a
                            href={`mailto:${settingsEmail}`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white hover:bg-white/[0.10]"
                          >
                            <Mail className="h-4 w-4" />
                            E-Mail schreiben
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* ── Trust Badges + Navigation ── */}
              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="mb-6 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    SSL verschlüsselt
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Sichere Zahlung
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Sichere Abwicklung
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Zurück
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-400"
                    >
                      Weiter
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!step4Visited}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black text-white transition',
                        step4Visited
                          ? 'bg-emerald-500 hover:bg-emerald-400'
                          : 'bg-zinc-600 cursor-not-allowed'
                      )}
                    >
                      Zur Kasse
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
