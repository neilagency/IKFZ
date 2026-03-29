'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { Shield, Loader2, Eye, EyeOff, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AnmeldenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    }>
      <AnmeldenContent />
    </Suspense>
  );
}

function AnmeldenContent() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register, customer } = useCustomerAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/konto';

  if (customer) {
    router.replace(redirect);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (mode === 'login') {
      result = await login(email, password);
    } else {
      result = await register({ email, password, firstName, lastName });
    }

    if (result.success) {
      router.push(redirect);
    } else {
      setError(result.error || 'Ein Fehler ist aufgetreten.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 relative flex items-center justify-center px-4 py-24 sm:py-28 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm tracking-tight">iK</span>
            </div>
            <div>
              <div className="text-[15px] font-bold leading-tight text-white">IKFZ Digital</div>
              <div className="text-[11px] font-medium tracking-wide text-white/70">ZULASSUNG</div>
            </div>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">
            {mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
          </h1>
          <p className="text-white/50 mt-2 text-sm leading-relaxed">
            {mode === 'login'
              ? 'Melden Sie sich an, um Ihre Bestellungen zu verwalten.'
              : 'Kostenlos registrieren — Ihre Bestellungen immer im Blick.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-6 sm:p-8">
          {/* Tab Switcher */}
          <div className="flex bg-white/[0.06] rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Registrieren
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 tracking-wide uppercase">Vorname</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/25 focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition"
                      placeholder="Max"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 tracking-wide uppercase">Nachname</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-3 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/25 focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition"
                    placeholder="Mustermann"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 tracking-wide uppercase">E-Mail-Adresse</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/25 focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition"
                  placeholder="ihre@email.de"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 tracking-wide uppercase">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-9 pr-10 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/25 focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition"
                  placeholder={mode === 'register' ? 'Min. 8 Zeichen' : '••••••••'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20 hover:shadow-primary/30 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Trust badges */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-4 text-[11px] text-white/30">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              SSL-verschlüsselt
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              DSGVO-konform
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span>Kein Spam</span>
          </div>

          {/* Guest checkout link */}
          <p className="text-center text-xs text-white/25 mt-2">
            Sie können auch ohne Konto bestellen.{' '}
            <Link href="/product/auto-online-anmelden" className="text-primary/70 hover:text-primary transition-colors">
              Direkt zur Bestellung →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
