'use client';

import { useState, useRef } from 'react';
import { Send, Upload, X, Loader2 } from 'lucide-react';

const carBrands = [
  'Abarth','AC Cars','Acura','Aixam','Alfa Romeo','Alpina','Alpine','Aston Martin','Audi','Austin',
  'BAIC','Bentley','BMW','Borgward','Brabus','Bugatti','Buick','BYD',
  'Cadillac','Caterham','Changan','Chery','Chevrolet','Chrysler','Citroën','Cupra',
  'Dacia','Daewoo','Daihatsu','Daimler','Datsun','DeLorean','Dodge','DS Automobiles',
  'Ferrari','Fiat','Fisker','Ford',
  'Geely','Genesis','GMC','Great Wall',
  'Haval','Honda','Hummer','Hyundai',
  'Infiniti','Isuzu','IVECO',
  'Jaguar','Jeep',
  'Karma','Kia','Koenigsegg','KTM',
  'Lada','Lamborghini','Lancia','Land Rover','Lexus','Lincoln','Lotus','Lucid','Lynk & Co',
  'Mahindra','Maserati','Maybach','Mazda','McLaren','Mercedes-Benz','MG','Mini','Mitsubishi','Morgan',
  'Nissan','NIO',
  'Oldsmobile','Opel',
  'Pagani','Peugeot','Plymouth','Polestar','Pontiac','Porsche','Proton',
  'RAM','Renault','Rimac','Rolls-Royce','Rover',
  'Saab','Seat','Shelby','Skoda','Smart','SsangYong','Subaru','Suzuki',
  'Tata','Tesla','Toyota','Trabant','Triumph',
  'Vauxhall','Volkswagen','Volvo',
  'Wiesmann',
  'XPeng',
  'Zagato','Zastava','Zotye',
];

const years = Array.from({ length: 86 }, (_, i) => 2025 - i);

const mileageRanges = [
  'unter 10.000 km',
  '10.000 - 20.000 km','20.000 - 30.000 km','30.000 - 40.000 km','40.000 - 50.000 km',
  '50.000 - 60.000 km','60.000 - 70.000 km','70.000 - 80.000 km','80.000 - 90.000 km',
  '90.000 - 100.000 km','100.000 - 110.000 km','110.000 - 120.000 km','120.000 - 130.000 km',
  '130.000 - 140.000 km','140.000 - 150.000 km','150.000 - 160.000 km','160.000 - 170.000 km',
  '170.000 - 180.000 km','180.000 - 190.000 km','190.000 - 200.000 km',
  '200.000 - 250.000 km','250.000 - 300.000 km','über 300.000 km',
];

const transmissions = [
  'Schaltgetriebe (Manuell)',
  'Automatikgetriebe',
  'Halbautomatisches Getriebe',
  'Elektrisches Getriebe',
];

const fuelTypes = [
  'Benzin (Superbenzin)',
  'Diesel',
  'Elektrizität',
  'Wasserstoff',
  'Erdgas (CNG/LNG)',
  'Hybrid',
];

interface FormData {
  marke: string;
  modell: string;
  baujahr: string;
  kilometerstand: string;
  getriebe: string;
  kraftstoff: string;
  preisvorstellung: string;
  name: string;
  telefon: string;
  email: string;
  plz: string;
}

export default function AutoVerkaufenForm() {
  const [form, setForm] = useState<FormData>({
    marke: '', modell: '', baujahr: '', kilometerstand: '',
    getriebe: '', kraftstoff: '', preisvorstellung: '',
    name: '', telefon: '', email: '', plz: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (key: keyof FormData, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 10 - photos.length);
    setPhotos(prev => [...prev, ...newFiles]);
  };

  const removePhoto = (i: number) =>
    setPhotos(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.marke || !form.modell || !form.baujahr || !form.name || !form.telefon || !form.email) {
      setError('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setSending(true);

    try {
      // Build WhatsApp message
      const lines = [
        '🚗 *Auto Verkaufen – Anfrage*',
        '',
        `*Marke:* ${form.marke}`,
        `*Modell:* ${form.modell}`,
        `*Baujahr:* ${form.baujahr}`,
        form.kilometerstand ? `*Kilometerstand:* ${form.kilometerstand}` : '',
        form.getriebe ? `*Getriebe:* ${form.getriebe}` : '',
        form.kraftstoff ? `*Kraftstoff:* ${form.kraftstoff}` : '',
        form.preisvorstellung ? `*Preisvorstellung:* ${form.preisvorstellung} €` : '',
        '',
        `*Name:* ${form.name}`,
        `*Telefon:* ${form.telefon}`,
        `*E-Mail:* ${form.email}`,
        form.plz ? `*PLZ:* ${form.plz}` : '',
        '',
        photos.length > 0 ? `📷 ${photos.length} Foto(s) werden separat gesendet.` : '',
      ].filter(Boolean).join('\n');

      const whatsappUrl = `https://wa.me/4915224999190?text=${encodeURIComponent(lines)}`;
      window.open(whatsappUrl, '_blank');
      setSent(true);
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl bg-white border border-primary/20 shadow-sm p-8 md:p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Send className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-dark-900 mb-3">Anfrage gesendet!</h3>
        <p className="text-dark-500 mb-6">
          Vielen Dank für Ihre Anfrage. Bitte senden Sie die Nachricht über WhatsApp ab.
          Wir melden uns schnellstmöglich mit einem kostenlosen Angebot bei Ihnen.
        </p>
        <button
          onClick={() => { setSent(false); setForm({ marke: '', modell: '', baujahr: '', kilometerstand: '', getriebe: '', kraftstoff: '', preisvorstellung: '', name: '', telefon: '', email: '', plz: '' }); setPhotos([]); }}
          className="text-primary font-semibold hover:underline"
        >
          Neue Anfrage stellen
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-dark-100 shadow-sm p-6 md:p-10">
      <h3 className="text-2xl font-bold text-dark-900 mb-2">Kostenlose Fahrzeugbewertung</h3>
      <p className="text-dark-500 mb-8">Füllen Sie das Formular aus und erhalten Sie ein unverbindliches Angebot.</p>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        {/* Marke */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">Marke *</label>
          <select
            value={form.marke}
            onChange={e => update('marke', e.target.value)}
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            required
          >
            <option value="">Auswählen</option>
            {carBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Modell */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">Modell-Typ *</label>
          <input
            type="text"
            value={form.modell}
            onChange={e => update('modell', e.target.value)}
            placeholder="z.B. A4 Avant, Golf GTI"
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 placeholder:text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            required
          />
        </div>

        {/* Baujahr */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">Baujahr *</label>
          <select
            value={form.baujahr}
            onChange={e => update('baujahr', e.target.value)}
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            required
          >
            <option value="">Auswählen</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Kilometerstand */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">Kilometerstand</label>
          <select
            value={form.kilometerstand}
            onChange={e => update('kilometerstand', e.target.value)}
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          >
            <option value="">Auswählen</option>
            {mileageRanges.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Getriebe */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">Getriebe</label>
          <select
            value={form.getriebe}
            onChange={e => update('getriebe', e.target.value)}
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          >
            <option value="">Bitte Auswählen</option>
            {transmissions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Kraftstoff */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">Kraftstoff</label>
          <select
            value={form.kraftstoff}
            onChange={e => update('kraftstoff', e.target.value)}
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          >
            <option value="">Bitte Auswählen</option>
            {fuelTypes.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Preisvorstellung */}
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">Preisvorstellung (€)</label>
          <input
            type="text"
            value={form.preisvorstellung}
            onChange={e => update('preisvorstellung', e.target.value)}
            placeholder="z.B. 15.000"
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 placeholder:text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Spacer for grid alignment */}
        <div className="hidden sm:block" />
      </div>

      {/* Divider */}
      <div className="border-t border-dark-100 my-8" />

      <h4 className="text-lg font-bold text-dark-900 mb-5">Ihre Kontaktdaten</h4>
      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Vor- und Nachname"
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 placeholder:text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">Telefonnummer *</label>
          <input
            type="tel"
            value={form.telefon}
            onChange={e => update('telefon', e.target.value)}
            placeholder="z.B. 0151 12345678"
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 placeholder:text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">E-Mail *</label>
          <input
            type="email"
            value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="ihre@email.de"
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 placeholder:text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-dark-700 mb-1.5">Postleitzahl</label>
          <input
            type="text"
            value={form.plz}
            onChange={e => update('plz', e.target.value)}
            placeholder="z.B. 45141"
            maxLength={5}
            className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-800 placeholder:text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Photos */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-dark-700 mb-1.5">Fotos (optional, max. 10)</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-dark-200 hover:border-primary/40 p-8 text-center transition-colors"
        >
          <Upload className="w-8 h-8 text-dark-300 mx-auto mb-2" />
          <p className="text-dark-500 text-sm">Klicken Sie hier, um Fotos hochzuladen</p>
          <p className="text-dark-400 text-xs mt-1">JPG, PNG – max. 10 Dateien</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => addPhotos(e.target.files)}
        />
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {photos.map((file, i) => (
              <div key={i} className="relative group">
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-dark-100">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={sending}
        className="w-full btn-primary text-lg justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Wird gesendet...</>
        ) : (
          <><Send className="w-5 h-5" /> Kostenlose Anfrage senden</>
        )}
      </button>

      <p className="text-dark-400 text-xs mt-4 text-center">
        Mit dem Absenden stimmen Sie unserer <a href="/datenschutzerklarung" className="text-primary hover:underline">Datenschutzerklärung</a> zu.
        Die Anfrage ist kostenlos und unverbindlich.
      </p>
    </form>
  );
}
