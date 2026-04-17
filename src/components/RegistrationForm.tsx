'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
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
  Package,
  CreditCard,
  Upload,
  Shield,
  Lock,
  X,
  Camera,
  Info,
  FileText,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  ShoppingCart,
  MessageCircle,
  Mail,
  Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';


// ── Zod Schema ──
const formSchema = z.object({
  service: z.string().min(1, 'Bitte wählen Sie eine Leistung'),
  ausweis: z.string().min(1, 'Bitte wählen Sie Ihren Ausweistyp'),
  evbNummer: z
    .string()
    .min(6, 'Bitte geben Sie Ihre eVB-Nummer ein (mind. 6 Zeichen)')
    .max(12, 'eVB-Nummer darf max. 12 Zeichen haben'),
  kennzeichenWahl: z.string().min(1, 'Bitte wählen Sie eine Kennzeichen-Option'),
  wunschkennzeichen: z.string().optional().default(''),
  kennzeichenPin: z.string().optional().default(''),
  kennzeichenBestellen: z.enum(['ja', 'nein'], {
    required_error: 'Bitte wählen Sie eine Option',
  }),
  kontoinhaber: z.string().min(2, 'Bitte geben Sie den Kontoinhaber ein'),
  iban: z
    .string()
    .min(15, 'Bitte geben Sie eine gültige IBAN ein')
    .max(34, 'IBAN darf maximal 34 Zeichen haben'),
});

type FormData = z.infer<typeof formSchema>;

// ── Step definitions ──
const FORM_STEPS = [
  { title: 'Service & Ausweis', description: 'Leistung wählen, eVB eingeben', icon: Car },
  { title: 'Kennzeichen', description: 'Wunschkennzeichen & Bestellung', icon: Package },
  { title: 'Bankdaten & Kasse', description: 'IBAN für KFZ-Steuer & bezahlen', icon: CreditCard },
];

const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
  0: ['service', 'ausweis', 'evbNummer'],
  1: ['kennzeichenWahl', 'kennzeichenBestellen'],
  2: ['kontoinhaber', 'iban'],
};

// ── Ausweis options ──
const AUSWEIS_OPTIONS = [
  { value: 'personalausweis', label: 'Deutscher Personalausweis' },
  { value: 'aufenthaltstitel', label: 'Aufenthaltstitel' },
  { value: 'reisepass', label: 'Reisepass' },
];

// ── Service label mapping ──
const SERVICE_LABELS: Record<string, string> = {
  neuzulassung: 'Anmelden',
  ummeldung: 'Ummelden',
  wiederzulassung: 'Wiederzulassen',
  neuwagen: 'Neuwagen Zulassung',
};

// ── Upload field definitions ──
interface UploadField {
  id: string;
  label: string;
  hint: string;
  exampleImage?: string;
}

const ALL_UPLOAD_FIELDS: Record<string, UploadField> = {
  fahrzeugscheinVorne: {
    id: 'fahrzeugscheinVorne',
    label: 'Fahrzeugschein (Teil I) – Vorderseite',
    hint: 'Bitte laden Sie die Vorderseite vom Fahrzeugschein (Teil I) vollständig hoch.',
    exampleImage: '/images/example-fahrzeugschein-vorderseite.jpg',
  },
  fahrzeugscheinHinten: {
    id: 'fahrzeugscheinHinten',
    label: 'Fahrzeugschein (Teil I) – Rückseite mit Sicherheitscode',
    hint: 'Bitte laden Sie die Rückseite vom Fahrzeugschein (Teil I) hoch. Der Sicherheitscode muss freigelegt und gut sichtbar sein.',
    exampleImage: '/images/example-fahrzeugschein-rueckseite.jpg',
  },
  fahrzeugbriefVorne: {
    id: 'fahrzeugbriefVorne',
    label: 'Fahrzeugbrief (Teil II) – Vorderseite mit Sicherheitscode',
    hint: 'Bitte laden Sie die Vorderseite vom Fahrzeugbrief (Teil II) vollständig hoch. Der Sicherheitscode auf der linken Seite muss sichtbar sein.',
    exampleImage: '/images/example-fahrzeugbrief-vorderseite.jpg',
  },
  personalausweisVorne: {
    id: 'personalausweisVorne',
    label: 'Personalausweis – Vorderseite',
    hint: 'Bitte laden Sie die Vorderseite Ihres Personalausweises gut leserlich hoch.',
    exampleImage: '/images/example-personalausweis-vorne.jpg',
  },
  personalausweisHinten: {
    id: 'personalausweisHinten',
    label: 'Personalausweis – Rückseite',
    hint: 'Bitte laden Sie die Rückseite Ihres Personalausweises gut leserlich hoch.',
    exampleImage: '/images/example-personalausweis-hinten.jpg',
  },
  aufenthaltstitelVorne: {
    id: 'aufenthaltstitelVorne',
    label: 'Aufenthaltstitel – Vorderseite',
    hint: 'Bitte laden Sie die Vorderseite Ihres Aufenthaltstitels gut leserlich hoch.',
    exampleImage: '/images/example-aufenthaltstitel-vorne.jpg',
  },
  aufenthaltstitelHinten: {
    id: 'aufenthaltstitelHinten',
    label: 'Aufenthaltstitel – Rückseite',
    hint: 'Bitte laden Sie die Rückseite Ihres Aufenthaltstitels gut leserlich hoch.',
    exampleImage: '/images/example-aufenthaltstitel-hinten.jpg',
  },
  reisepassVorne: {
    id: 'reisepassVorne',
    label: 'Reisepass – Seite mit Foto',
    hint: 'Bitte laden Sie die Seite mit Foto und persönlichen Daten gut leserlich hoch.',
    exampleImage: '/images/example-reisepass-vorne.jpg',
  },
  meldebescheinigung: {
    id: 'meldebescheinigung',
    label: 'Meldebescheinigung',
    hint: 'Bitte laden Sie eine aktuelle Meldebescheinigung oder ein behördliches Dokument mit Ihrer Adresse hoch.',
    exampleImage: '/images/example-meldebescheinigung.gif',
  },
};

function getVehicleDocIds(service: string): string[] {
  switch (service) {
    case 'neuwagen':
      return ['fahrzeugbriefVorne'];
    case 'wiederzulassung':
      return ['fahrzeugscheinVorne', 'fahrzeugscheinHinten'];
    default: // neuzulassung, ummeldung
      return ['fahrzeugscheinVorne', 'fahrzeugscheinHinten', 'fahrzeugbriefVorne'];
  }
}

function getVerificationDocIds(ausweis: string): string[] {
  switch (ausweis) {
    case 'aufenthaltstitel':
      return ['aufenthaltstitelVorne', 'aufenthaltstitelHinten'];
    case 'reisepass':
      return ['reisepassVorne', 'meldebescheinigung'];
    default: // personalausweis
      return ['personalausweisVorne', 'personalausweisHinten'];
  }
}

// ── Client-side image compression ──
async function compressImage(
  file: File,
  maxBytes = 3.5 * 1024 * 1024
): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= maxBytes) return file;
  const img = new window.Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = url;
  });
  URL.revokeObjectURL(url);

  const steps = [
    { maxDim: 1600, quality: 0.7 },
    { maxDim: 1200, quality: 0.6 },
    { maxDim: 1000, quality: 0.5 },
    { maxDim: 800, quality: 0.4 },
    { maxDim: 600, quality: 0.3 },
    { maxDim: 400, quality: 0.2 },
  ];

  for (const { maxDim, quality } of steps) {
    const scale = Math.min(maxDim / Math.max(img.width, img.height), 1);
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, 'image/jpeg', quality)
    );
    if (blob && blob.size <= maxBytes) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
      });
    }
  }
  return file;
}

// ── Shared input class ──
const INPUT_CLASS =
  'w-full rounded-2xl border border-dark-200 bg-white px-4 py-3 text-dark-800 outline-none transition placeholder:text-dark-400 focus:border-primary focus:ring-2 focus:ring-primary/20';
const SELECT_CLASS = INPUT_CLASS + ' appearance-none cursor-pointer';

// ── Props ──
interface RegistrationFormProps {
  productName: string;
  options: {
    services: { key: string; label: string; price: number }[];
    kennzeichen_reserviert: { label: string; price: number };
    kennzeichen_bestellen: { label: string; price: number };
  };
}

export default function RegistrationForm({
  productName,
  options,
}: RegistrationFormProps) {
  const router = useRouter();
  const formTopRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<
    Record<string, File | null>
  >({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [exampleModal, setExampleModal] = useState<{
    title: string;
    image: string;
    hint: string;
  } | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const services = options?.services ?? [];
  const reserviertPrice = options?.kennzeichen_reserviert?.price ?? 24.70;
  const bestellenPrice = options?.kennzeichen_bestellen?.price ?? 29.70;
  const contactPhone = '01522 4999190';
  const contactWhatsapp = 'https://wa.me/4915224999190';

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service: '',
      ausweis: '',
      evbNummer: '',
      kennzeichenWahl: '',
      wunschkennzeichen: '',
      kennzeichenPin: '',
      kennzeichenBestellen: 'nein',
      kontoinhaber: '',
      iban: '',
    },
  });

  const watchService = watch('service');
  const watchAusweis = watch('ausweis');
  const watchKennzeichenWahl = watch('kennzeichenWahl');
  const watchKennzeichenBestellen = watch('kennzeichenBestellen');

  const selectedServiceOption = useMemo(
    () => services.find((s) => s.key === watchService),
    [services, watchService]
  );

  const totalPrice = useMemo(() => {
    let price = selectedServiceOption?.price ?? 0;
    if (watchKennzeichenWahl === 'reserviert') price += reserviertPrice;
    if (watchKennzeichenBestellen === 'ja') price += bestellenPrice;
    return price;
  }, [
    selectedServiceOption,
    watchKennzeichenWahl,
    watchKennzeichenBestellen,
    reserviertPrice,
    bestellenPrice,
  ]);

  // ── Required upload IDs ──
  const requiredUploadIds = useMemo(() => {
    const vehicle = watchService ? getVehicleDocIds(watchService) : [];
    const verify = watchAusweis ? getVerificationDocIds(watchAusweis) : [];
    return [...vehicle, ...verify];
  }, [watchService, watchAusweis]);

  // ── Step navigation ──
  const scrollToTop = useCallback(() => {
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  const nextStep = useCallback(async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields?.length) {
      const valid = await trigger(fields);
      if (!valid) return;
    }

    // Manual validation for step 1 conditional fields
    if (currentStep === 1 && watchKennzeichenWahl === 'reserviert') {
      const wk = watch('wunschkennzeichen') || '';
      const pin = watch('kennzeichenPin') || '';
      let hasError = false;
      if (wk.length < 3) {
        setFormError('Bitte Ihr Wunschkennzeichen eingeben (mind. 3 Zeichen)');
        hasError = true;
      } else if (pin.length < 4) {
        setFormError(
          'Bitte die PIN der Reservierung eingeben (mind. 4 Zeichen)'
        );
        hasError = true;
      }
      if (hasError) return;
    }

    setFormError(null);
    setCurrentStep((s) => Math.min(s + 1, 2));
    scrollToTop();
  }, [currentStep, trigger, watchKennzeichenWahl, watch, scrollToTop]);

  const prevStep = useCallback(() => {
    setFormError(null);
    setCurrentStep((s) => Math.max(s - 1, 0));
    scrollToTop();
  }, [scrollToTop]);

  const goToStep = useCallback(
    (index: number) => {
      if (index < currentStep) {
        setCurrentStep(index);
        scrollToTop();
      }
    },
    [currentStep, scrollToTop]
  );

  // ── File handling ──
  const handleFileChange = useCallback(
    (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];
      if (!allowedTypes.includes(file.type)) {
        setUploadErrors((prev) => ({
          ...prev,
          [key]: `Ungültiger Dateityp: ${file.type}. Erlaubt: PDF, JPEG, PNG.`,
        }));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadErrors((prev) => ({
          ...prev,
          [key]: `Datei zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Max. 10 MB.`,
        }));
        return;
      }

      setUploadErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      setUploadedFiles((prev) => ({ ...prev, [key]: file }));
    },
    []
  );

  const removeFile = useCallback((key: string) => {
    setUploadedFiles((prev) => ({ ...prev, [key]: null }));
  }, []);

  // ── Submit ──
  const onSubmit = useCallback(
    async (data: FormData) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setFormError(null);

      // Validate all required uploads
      const missing: string[] = [];
      for (const id of requiredUploadIds) {
        if (!uploadedFiles[id]) {
          const field = ALL_UPLOAD_FIELDS[id];
          missing.push(id);
          setUploadErrors((prev) => ({
            ...prev,
            [id]: `Bitte ${field?.label ?? id} hochladen`,
          }));
        }
      }
      if (missing.length > 0) {
        submittingRef.current = false;
        return;
      }

      setIsSubmitting(true);

      try {
        // Upload each file
        const fileUrls: Record<string, { name: string; size: number; type: string; url: string }> = {};

        for (const id of requiredUploadIds) {
          const rawFile = uploadedFiles[id]!;
          const compressed = await compressImage(rawFile);

          const formData = new globalThis.FormData();
          formData.append('file', compressed);
          formData.append('fieldName', id);

          const res = await fetch('/api/upload/documents', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(
              errData.error || `Upload fehlgeschlagen: ${res.statusText}`
            );
          }

          const resData = await res.json();
          const uploaded = resData.files?.[0];
          if (!uploaded?.url) throw new Error('Keine URL vom Upload erhalten');

          fileUrls[id] = {
            name: uploaded.originalName || compressed.name,
            size: uploaded.size || compressed.size,
            type: uploaded.mimeType || compressed.type,
            url: uploaded.url,
          };
        }

        // Build addons
        const addons: { key: string; label: string; price: number }[] = [];
        if (data.kennzeichenWahl === 'reserviert') {
          addons.push({
            key: 'kennzeichen_reserviert',
            label: 'Reserviertes Kennzeichen',
            price: reserviertPrice,
          });
        }
        if (data.kennzeichenBestellen === 'ja') {
          addons.push({
            key: 'kennzeichen_bestellen',
            label: 'Kennzeichen bestellen',
            price: bestellenPrice,
          });
        }

        const serviceLabel =
          SERVICE_LABELS[data.service] || selectedServiceOption?.label || '';

        const orderData = {
          productName: `Fahrzeug online anmelden – ${serviceLabel}`,
          productSlug: 'auto-online-anmelden',
          serviceType: 'anmeldung',
          formType: 'autoanmeldung',
          formData: {
            ...data,
            serviceLabel,
            uploadedFiles: fileUrls,
          },
          basePrice: selectedServiceOption?.price ?? 0,
          addons,
          total: totalPrice,
        };

        sessionStorage.setItem('checkout_order', JSON.stringify(orderData));
        router.push('/rechnung/');
      } catch (err: any) {
        setFormError(
          err?.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
        );
        setIsSubmitting(false);
        submittingRef.current = false;
      }
    },
    [
      requiredUploadIds,
      uploadedFiles,
      reserviertPrice,
      bestellenPrice,
      selectedServiceOption,
      totalPrice,
      router,
    ]
  );

  // ── FileUploadCard ──
  const FileUploadCard = ({ fieldId }: { fieldId: string }) => {
    const field = ALL_UPLOAD_FIELDS[fieldId];
    if (!field) return null;
    const file = uploadedFiles[fieldId];
    const error = uploadErrors[fieldId];
    const hasFile = !!file;

    return (
      <div
        className={cn(
          'rounded-xl border-2 border-dashed p-4 transition-all',
          hasFile
            ? 'border-green-300 bg-green-50/50'
            : error
            ? 'border-red-300 bg-red-50/50'
            : 'border-dark-200 bg-dark-50/50 hover:border-primary/40 hover:bg-primary/5'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-dark-800">
            {field.label} <span className="text-red-500">*</span>
          </span>
          {field.exampleImage && (
            <button
              type="button"
              onClick={() =>
                setExampleModal({
                  title: field.label,
                  image: field.exampleImage!,
                  hint: field.hint,
                })
              }
              className="p-1 text-dark-400 hover:text-primary transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>

        {hasFile ? (
          <div className="flex items-center gap-3">
            {file.type.startsWith('image/') ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-green-200 flex-shrink-0">
                <Image
                  src={URL.createObjectURL(file)}
                  alt={field.label}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-800 truncate">
                {file.name}
              </p>
              <p className="text-xs text-dark-400">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeFile(fieldId)}
              className="p-1.5 rounded-full hover:bg-red-50 text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Datei hochgeladen
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRefs.current[fieldId]?.click()}
            className="w-full flex flex-col items-center gap-2 py-4"
          >
            <Camera className="w-6 h-6 text-dark-400" />
            <span className="text-sm text-dark-600">
              Foto aufnehmen oder Datei wählen
            </span>
            <span className="text-xs text-dark-400">
              JPG, PNG oder PDF · max. 10 MB
            </span>
          </button>
        )}

        <input
          ref={(el) => {
            fileInputRefs.current[fieldId] = el;
          }}
          type="file"
          accept="image/jpeg,image/jpg,image/png,application/pdf"
          onChange={(e) => handleFileChange(fieldId, e)}
          className="hidden"
        />

        {error && (
          <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}
      </div>
    );
  };

  // ── Render ──
  return (
    <div ref={formTopRef} className="overflow-hidden rounded-2xl md:rounded-3xl border border-dark-100/60 bg-white shadow-card">
      <div className="p-4 md:p-6 lg:p-8">

      {/* ── Help Banner ── */}
      <div className="flex items-center gap-3 rounded-2xl p-4 mb-6 bg-primary/[0.04] border border-primary/10">
        <Phone className="w-5 h-5 text-primary flex-shrink-0" />
        <span className="text-sm text-dark-600">
          Benötigen Sie Hilfe? Rufen Sie uns an:{' '}
          <a href="tel:015224999190" className="font-bold text-primary hover:underline">
            ℡ {contactPhone}
          </a>
        </span>
      </div>

      {/* ── Step Indicator ── */}
      <div className="mb-6 overflow-hidden rounded-xl border border-dark-100 bg-dark-50 p-3 md:p-4">
        <div className="flex items-center justify-between">
          {FORM_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = currentStep > i;
            const isActive = currentStep === i;
            return (
              <div
                key={i}
                className="flex items-center flex-1 last:flex-initial"
              >
                <div
                  className={cn(
                    'flex flex-col items-center',
                    isCompleted && 'cursor-pointer'
                  )}
                  onClick={() => goToStep(i)}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all sm:h-9 sm:w-9 md:h-10 md:w-10',
                      isCompleted
                        ? 'border-primary bg-primary text-white'
                        : isActive
                        ? 'border-primary bg-primary/10 text-primary shadow-[0_0_0_6px_rgba(0,168,90,0.12)]'
                        : 'border-dark-200 bg-dark-50 text-dark-400'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'hidden md:block text-[10px] md:text-xs font-medium mt-1.5 transition-colors text-center',
                      isActive
                        ? 'text-primary font-bold'
                        : isCompleted
                        ? 'text-dark-600 font-bold'
                        : 'text-dark-400'
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {i < FORM_STEPS.length - 1 && (
                  <div className="flex-1 mx-1.5 md:mx-3 h-0.5 mt-[-14px] md:mt-[-18px]">
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
        <div style={{ minHeight: 400 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="animate-in fade-in slide-in-from-right-4 duration-300"
            >
              {/* ════ STEP 1: Service & Ausweis ════ */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Car className="w-6 h-6 text-primary" />
                    <div>
                      <h3 className="text-lg font-bold text-dark-900">
                        Service & Ausweis
                      </h3>
                      <p className="text-sm text-dark-500">
                        Wählen Sie Ihre gewünschte Leistung und Ihren Ausweistyp
                      </p>
                    </div>
                  </div>

                  {/* Service select */}
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Was möchten Sie tun?{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('service')}
                      className={cn(
                        SELECT_CLASS,
                        errors.service && 'border-red-400 focus:ring-red-400'
                      )}
                    >
                      <option value="">— Bitte wählen —</option>
                      {services.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {SERVICE_LABELS[opt.key] || opt.label} ( +{' '}
                          {opt.price.toFixed(2).replace('.', ',')} € )
                        </option>
                      ))}
                    </select>
                    {errors.service && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.service.message}
                      </p>
                    )}
                  </div>

                  {/* Ausweis select */}
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Welchen Ausweis besitzen Sie?{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('ausweis')}
                      className={cn(
                        SELECT_CLASS,
                        errors.ausweis && 'border-red-400 focus:ring-red-400'
                      )}
                    >
                      <option value="">— Bitte wählen —</option>
                      {AUSWEIS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.ausweis && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.ausweis.message}
                      </p>
                    )}
                  </div>

                  {/* eVB Nummer */}
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      eVB Nummer eintragen (Versicherungsbestätigung){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('evbNummer')}
                      placeholder="z. B. A1B2C3D"
                      className={cn(
                        INPUT_CLASS,
                        errors.evbNummer && 'border-red-400 focus:ring-red-400'
                      )}
                    />
                    {errors.evbNummer && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.evbNummer.message}
                      </p>
                    )}
                    <p className="text-xs text-dark-500 mt-2 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-dark-400" />
                      Die eVB-Nummer erhalten Sie von Ihrer KFZ-Versicherung
                    </p>
                  </div>
                </div>
              )}

              {/* ════ STEP 2: Kennzeichen ════ */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Package className="w-6 h-6 text-primary" />
                    <div>
                      <h3 className="text-lg font-bold text-dark-900">
                        Kennzeichen
                      </h3>
                      <p className="text-sm text-dark-500">
                        Wunschkennzeichen & Bestelloptionen
                      </p>
                    </div>
                  </div>

                  {/* Kennzeichen select */}
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Welches Kennzeichen möchten Sie?{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('kennzeichenWahl')}
                      className={cn(
                        SELECT_CLASS,
                        errors.kennzeichenWahl &&
                          'border-red-400 focus:ring-red-400'
                      )}
                    >
                      <option value="">— Bitte wählen —</option>
                      <option value="automatisch">
                        Automatische Zuteilung
                      </option>
                      <option value="reserviert">
                        Reserviertes Kennzeichen ( +{' '}
                        {reserviertPrice.toFixed(2).replace('.', ',')} € )
                      </option>
                    </select>
                    {errors.kennzeichenWahl && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.kennzeichenWahl.message}
                      </p>
                    )}
                  </div>

                  {/* Conditional: Reserviertes Kennzeichen panel */}
                  {watchKennzeichenWahl === 'reserviert' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4"
                    >
                      <p className="text-sm text-dark-700">
                        Bitte Ihr Wunschkennzeichen und die PIN aus der
                        Reservierung eintragen. Kein vorhanden?{' '}
                        <a
                          href={contactWhatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline font-bold"
                        >
                          Kontaktieren Sie uns.
                        </a>
                      </p>

                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-2">
                          Wunschkennzeichen{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={watch('wunschkennzeichen') || ''}
                          onChange={(e) =>
                            setValue('wunschkennzeichen', e.target.value.toUpperCase())
                          }
                          placeholder="z.B. B-AB 1234"
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-dark-800 mb-2">
                          PIN für reserviertes Kennzeichen{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('kennzeichenPin')}
                          placeholder="z.B. 123456"
                          className={INPUT_CLASS}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Kennzeichen bestellen radio */}
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-3">
                      Möchten Sie Ihre Kennzeichen mitbestellen?{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={cn(
                          'flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all',
                          watchKennzeichenBestellen === 'ja'
                            ? 'border-primary bg-primary/5'
                            : 'border-dark-200 hover:border-dark-300'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="ja"
                            {...register('kennzeichenBestellen')}
                            className="accent-primary"
                          />
                          <span className="font-bold text-dark-800">
                            Ja{' '}
                            <strong>
                              (+ {bestellenPrice.toFixed(2).replace('.', ',')} €)
                            </strong>
                          </span>
                        </div>
                        <span className="text-xs text-dark-500 mt-1 ml-6">
                          Lieferung in 2–3 Werktagen
                        </span>
                      </label>
                      <label
                        className={cn(
                          'flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all',
                          watchKennzeichenBestellen === 'nein'
                            ? 'border-primary bg-primary/5'
                            : 'border-dark-200 hover:border-dark-300'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="nein"
                            {...register('kennzeichenBestellen')}
                            className="accent-primary"
                          />
                          <span className="font-bold text-dark-800">
                            Nein
                          </span>
                        </div>
                        <span className="text-xs text-dark-500 mt-1 ml-6">
                          Selbst beim Schildermacher prägen
                        </span>
                      </label>
                    </div>
                    {errors.kennzeichenBestellen && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.kennzeichenBestellen.message}
                      </p>
                    )}
                    <p className="text-xs text-dark-500 mt-3">
                      Hinweis: Kennzeichen von uns werden in 2–3 Werktagen
                      geliefert.
                    </p>
                  </div>
                </div>
              )}

              {/* ════ STEP 3: Bankdaten & Kasse ════ */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Landmark className="w-6 h-6 text-primary" />
                    <div>
                      <h3 className="text-lg font-bold text-dark-900">
                        Bankverbindung für die Kfz-Steuerlastschrift
                      </h3>
                      <p className="text-sm text-dark-500">
                        IBAN wird für die automatische KFZ-Steuer benötigt
                      </p>
                    </div>
                  </div>

                  {/* Kontoinhaber */}
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      Kontoinhaber (Vor- und Nachname){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('kontoinhaber')}
                      placeholder="Max Mustermann"
                      className={cn(
                        INPUT_CLASS,
                        errors.kontoinhaber &&
                          'border-red-400 focus:ring-red-400'
                      )}
                    />
                    {errors.kontoinhaber && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.kontoinhaber.message}
                      </p>
                    )}
                  </div>

                  {/* IBAN */}
                  <div>
                    <label className="block text-sm font-semibold text-dark-800 mb-2">
                      IBAN (Kontonummer/BLZ){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('iban')}
                      placeholder="DE89 3704 0044 0532 0130 00"
                      className={cn(
                        INPUT_CLASS,
                        errors.iban && 'border-red-400 focus:ring-red-400'
                      )}
                    />
                    {errors.iban && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.iban.message}
                      </p>
                    )}
                    <p className="text-xs text-dark-500 mt-2 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-dark-400" />
                      Wird nur für das Lastschriftmandat der KFZ-Steuer
                      verwendet
                    </p>
                  </div>

                  <hr className="border-dark-200" />

                  {/* Vehicle Documents */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="w-5 h-5 text-primary" />
                      <h4 className="font-bold text-dark-800">
                        Fahrzeugdokumente hochladen
                      </h4>
                    </div>
                    <p className="text-sm text-dark-500 mb-4">
                      Bitte laden Sie die für Ihren Service benötigten
                      Fahrzeugdokumente hoch
                    </p>
                    <div className="space-y-3">
                      {getVehicleDocIds(watchService).map((id) => (
                        <FileUploadCard key={id} fieldId={id} />
                      ))}
                    </div>
                  </div>

                  <hr className="border-dark-200" />

                  {/* Verification Documents */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <h4 className="font-bold text-dark-800">
                        Verifizierung (Verimi)
                      </h4>
                    </div>
                    <p className="text-sm text-dark-500 mb-4">
                      Bitte laden Sie die passenden Dokumente gut leserlich hoch
                    </p>
                    <div className="space-y-3">
                      {getVerificationDocIds(watchAusweis).map((id) => (
                        <FileUploadCard key={id} fieldId={id} />
                      ))}
                    </div>
                  </div>

                  <hr className="border-dark-200" />

                  {/* Upload help box */}
                  <div className="rounded-xl bg-dark-50 border border-dark-200 p-4">
                    <p className="text-sm text-dark-600 mb-3">
                      Probleme beim Hochladen? Senden Sie uns die Fotos
                      alternativ per WhatsApp oder E-Mail.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={contactWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#25D366] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                      <a
                        href="mailto:info@ikfzdigitalzulassung.de"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        <Mail className="w-3.5 h-3.5" /> E-Mail
                      </a>
                    </div>
                  </div>

                  {/* Wichtige Informationen (collapsible) */}
                  <details className="group rounded-xl bg-amber-50 border border-amber-200 overflow-hidden">
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                      <div>
                        <span className="font-semibold text-amber-800 text-sm">
                          Wichtige Informationen
                        </span>
                        <span className="block text-xs text-amber-600 mt-0.5">
                          Bitte prüfen Sie Ihre Angaben vor dem Absenden genau
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-amber-600 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pb-4 text-sm text-amber-700 space-y-2">
                      <p>
                        Bitte achten Sie darauf, dass alle Angaben exakt mit
                        Ihren Dokumenten übereinstimmen.
                      </p>
                      <p>
                        Besonders wichtig sind die eVB-Nummer, der vollständige
                        Name laut Ausweis, bereits reservierte Kennzeichen, die
                        PIN der Reservierung und Ihre Bankdaten.
                      </p>
                      <p>
                        Wenn Daten bei Versicherung, Kennzeichen-Reservierung
                        oder Lastschrift nicht korrekt hinterlegt sind, kann der
                        Antrag abgelehnt werden.
                      </p>
                      <p>
                        Eine Ablehnung kann kostenpflichtig sein. Wenn Sie
                        unsicher sind, kontaktieren Sie uns bitte vor dem
                        Absenden kurz per WhatsApp oder Telefon.
                      </p>
                      <p>
                        Wichtig ist außerdem, dass bei Ihrer zuständigen
                        Zulassungsstelle keine offenen Steuerrückstände
                        bestehen.
                      </p>
                    </div>
                  </details>

                  {/* Price Summary */}
                  <div className="rounded-2xl border border-dark-100 p-5">
                    <div className="space-y-2 text-sm">
                      {selectedServiceOption && (
                        <div className="flex justify-between">
                          <span className="text-dark-600">
                            {SERVICE_LABELS[watchService] ||
                              selectedServiceOption.label}
                          </span>
                          <span className="font-medium text-dark-800">
                            {selectedServiceOption.price
                              .toFixed(2)
                              .replace('.', ',')}{' '}
                            €
                          </span>
                        </div>
                      )}
                      {watchKennzeichenWahl === 'reserviert' && (
                        <div className="flex justify-between">
                          <span className="text-dark-600">
                            Reserviertes Kennz.
                          </span>
                          <span className="font-medium text-dark-800">
                            +{reserviertPrice.toFixed(2).replace('.', ',')} €
                          </span>
                        </div>
                      )}
                      {watchKennzeichenBestellen === 'ja' && (
                        <div className="flex justify-between">
                          <span className="text-dark-600">
                            Kennzeichen-Best.
                          </span>
                          <span className="font-medium text-dark-800">
                            +{bestellenPrice.toFixed(2).replace('.', ',')} €
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-3 mt-2 border-t border-dark-200">
                        <span className="font-bold text-dark-900">Gesamt</span>
                        <span className="font-bold text-primary text-lg">
                          {totalPrice.toFixed(2).replace('.', ',')} €
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="pt-6">
          {/* Form Error Banner */}
          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{formError}</p>
              </div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="p-1 text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-2 px-4 py-2.5 text-dark-500 hover:text-primary transition-colors text-sm font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> Zurück
              </button>
            ) : (
              <div />
            )}

            {currentStep < 2 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-600 hover:shadow-lg hover:shadow-primary/25 transition-all text-sm"
              >
                Weiter <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-600 hover:shadow-lg hover:shadow-primary/25 transition-all text-sm',
                  isSubmitting && 'opacity-70 cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wird gesendet …
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Zur Kasse – {totalPrice.toFixed(2).replace('.', ',')} €
                  </>
                )}
              </button>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-dark-100 text-xs text-dark-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> SSL-verschlüsselt
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> KBA-registriert
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Live-Support: {contactPhone}
            </span>
          </div>
        </div>
      </form>
      </div>

      {/* ── Example Image Modal ── */}
      <AnimatePresence>
        {exampleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setExampleModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-dark-100">
                <h4 className="font-bold text-dark-800 text-sm">
                  {exampleModal.title}
                </h4>
                <button
                  onClick={() => setExampleModal(null)}
                  className="p-1.5 rounded-full hover:bg-dark-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative w-full aspect-square">
                <Image
                  src={exampleModal.image}
                  alt={exampleModal.title}
                  fill
                  className="object-contain"
                />
              </div>
              <p className="p-4 text-sm text-dark-600">{exampleModal.hint}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
