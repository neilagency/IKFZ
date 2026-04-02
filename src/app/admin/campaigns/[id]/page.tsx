'use client';

import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Save,
  Send,
  TestTube2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Users,
  Clock,
  X,
  Sparkles,
} from 'lucide-react';

const TiptapEditor = dynamic(() => import('@/components/admin/TiptapEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-gray-100 rounded-lg border border-gray-200 animate-pulse flex items-center justify-center text-gray-400 text-sm">
      Editor wird geladen…
    </div>
  ),
});

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TEMPLATES = [
  { id: 'welcome', name: 'Willkommen', icon: '👋', desc: 'Begrüßung neuer Kunden' },
  { id: 'discount', name: 'Rabatt-Aktion', icon: '🏷️', desc: 'Sonderangebot oder Rabattcode' },
  { id: 'reminder', name: 'Erinnerung', icon: '🔔', desc: 'Kunden an offene Aufgaben erinnern' },
  { id: 'newsletter', name: 'Newsletter', icon: '📰', desc: 'Allgemeine Neuigkeiten & Updates' },
  { id: 'feedback', name: 'Feedback anfragen', icon: '⭐', desc: 'Kundenbewertung einholen' },
  { id: 'empty', name: 'Leere Vorlage', icon: '📄', desc: 'Starten Sie von Grund auf' },
];

const SEGMENTS = [
  { value: 'all-customers', label: 'Alle Kunden' },
  { value: 'recent-orders', label: 'Letzte 30 Tage bestellt' },
  { value: 'no-orders', label: 'Noch keine Bestellung' },
  { value: 'repeat-customers', label: 'Wiederkehrende Kunden' },
];

type ToastType = { message: string; type: 'success' | 'error' } | null;

function Toast({ toast, onClose }: { toast: NonNullable<ToastType>; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}
      >
        {toast.type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 shrink-0" />
        )}
        {toast.message}
        <button onClick={onClose} className="ml-2 p-0.5 hover:opacity-70">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function CampaignEditorPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [heading, setHeading] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [targetMode, setTargetMode] = useState('all');
  const [targetEmails, setTargetEmails] = useState('');
  const [targetSegment, setTargetSegment] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [templateId, setTemplateId] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastType>(null);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(isNew ? null : id);
  const [templateStep, setTemplateStep] = useState(isNew);
  const [loaded, setLoaded] = useState(false);

  // Load existing campaign
  const { data, error, isLoading } = useSWR(
    !isNew && id ? `/api/admin/email-campaigns/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (data && !data.error && !loaded) {
      setName(data.name || '');
      setSubject(data.subject || '');
      setHeading(data.heading || '');
      setContent(data.content || '');
      setImageUrl(data.imageUrl || '');
      setCtaText(data.ctaText || '');
      setCtaUrl(data.ctaUrl || '');
      setTargetMode(data.targetMode || 'all');
      setTargetEmails(data.targetEmails || '');
      setTargetSegment(data.targetSegment || '');
      setTemplateId(data.templateId || '');
      setScheduledAt(
        data.scheduledAt
          ? new Date(data.scheduledAt).toISOString().slice(0, 16)
          : ''
      );
      setLoaded(true);
    }
  }, [data, loaded]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  // Create from template
  const handleSelectTemplate = useCallback(
    async (tplId: string) => {
      try {
        const res = await fetch('/api/admin/email-campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `Neue Kampagne`, templateId: tplId }),
        });
        const json = await res.json();
        if (!res.ok) {
          showToast(json.error || 'Fehler beim Erstellen', 'error');
          return;
        }
        setCampaignId(json.id);
        setName(json.name || '');
        setSubject(json.subject || '');
        setHeading(json.heading || '');
        setContent(json.content || '');
        setCtaText(json.ctaText || '');
        setCtaUrl(json.ctaUrl || '');
        setTemplateId(tplId);
        setTemplateStep(false);
        // Update URL without full navigation
        window.history.replaceState(null, '', `/admin/campaigns/${json.id}`);
        showToast('Kampagne erstellt');
      } catch {
        showToast('Netzwerkfehler', 'error');
      }
    },
    [showToast]
  );

  // Save
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      showToast('Name ist erforderlich', 'error');
      return;
    }

    setSaving(true);
    try {
      let cid = campaignId;

      if (!cid) {
        // Create first
        const createRes = await fetch('/api/admin/email-campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), templateId }),
        });
        const createJson = await createRes.json();
        if (!createRes.ok) {
          showToast(createJson.error || 'Fehler beim Erstellen', 'error');
          return;
        }
        cid = createJson.id;
        setCampaignId(cid);
        window.history.replaceState(null, '', `/admin/campaigns/${cid}`);
      }

      const res = await fetch(`/api/admin/email-campaigns/${cid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          heading: heading.trim(),
          content,
          imageUrl: imageUrl.trim(),
          ctaText: ctaText.trim(),
          ctaUrl: ctaUrl.trim(),
          targetMode,
          targetEmails,
          targetSegment,
          scheduledAt: scheduledAt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Fehler beim Speichern', 'error');
        return;
      }
      showToast('Kampagne gespeichert');
      mutate(`/api/admin/email-campaigns/${cid}`);
    } catch {
      showToast('Netzwerkfehler', 'error');
    } finally {
      setSaving(false);
    }
  }, [name, subject, heading, content, imageUrl, ctaText, ctaUrl, targetMode, targetEmails, targetSegment, scheduledAt, campaignId, templateId, showToast]);

  // Send test
  const handleTestSend = useCallback(async () => {
    if (!testEmail.trim() || !campaignId) return;
    setSendingTest(true);
    try {
      // Save first
      await handleSave();

      const res = await fetch(`/api/admin/email-campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Fehler beim Test-Versand', 'error');
        return;
      }
      showToast('Test-E-Mail gesendet');
      setShowTestEmail(false);
      setTestEmail('');
    } catch {
      showToast('Netzwerkfehler', 'error');
    } finally {
      setSendingTest(false);
    }
  }, [testEmail, campaignId, handleSave, showToast]);

  // Send campaign
  const handleSendCampaign = useCallback(async () => {
    if (!campaignId) return;
    setSending(true);
    try {
      await handleSave();

      const res = await fetch(`/api/admin/email-campaigns/${campaignId}/send`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || 'Fehler beim Senden', 'error');
        return;
      }
      showToast('Kampagne wird gesendet!');
      setShowSendConfirm(false);
      mutate(`/api/admin/email-campaigns/${campaignId}`);
      router.push('/admin/campaigns');
    } catch {
      showToast('Netzwerkfehler', 'error');
    } finally {
      setSending(false);
    }
  }, [campaignId, handleSave, showToast, router]);

  const isEditable = !data || data.status === 'draft' || data.status === 'scheduled';

  // Loading state for existing campaign
  if (!isNew && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isNew && error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">Kampagne konnte nicht geladen werden</p>
          <Link href="/admin/campaigns" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // Template selection step for new campaigns
  if (templateStep) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href="/admin/campaigns"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Neue Kampagne erstellen</h1>
            <p className="text-sm text-gray-500 mt-1">
              Wählen Sie eine Vorlage als Ausgangspunkt
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl.id)}
                className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-blue-300 transition-all group"
              >
                <div className="text-3xl mb-3">{tpl.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {tpl.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{tpl.desc}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setTemplateStep(false);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Ohne Vorlage starten
            </button>
          </div>
        </div>
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Back link */}
        <Link
          href="/admin/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew || !campaignId ? 'Neue Kampagne' : 'Kampagne bearbeiten'}
            </h1>
            {data?.status && (
              <p className="text-sm text-gray-500 mt-1">
                Status: {data.status === 'draft' ? 'Entwurf' : data.status === 'scheduled' ? 'Geplant' : data.status === 'sent' ? 'Gesendet' : data.status}
              </p>
            )}
          </div>

          {isEditable && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Speichern
              </button>
              {campaignId && (
                <>
                  <button
                    onClick={() => setShowTestEmail(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <TestTube2 className="w-4 h-4" />
                    Test senden
                  </button>
                  <button
                    onClick={() => setShowSendConfirm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Kampagne senden
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-400" />
              Grunddaten
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kampagnenname *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditable}
                  placeholder="z.B. Black Friday Aktion"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Betreff
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={!isEditable}
                  placeholder="E-Mail Betreffzeile"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Überschrift
                </label>
                <input
                  type="text"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  disabled={!isEditable}
                  placeholder="Hauptüberschrift in der E-Mail"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          </section>

          {/* Content */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gray-400" />
              Inhalt
            </h2>
            <TiptapEditor
              content={content}
              onChange={(html) => setContent(html)}
              placeholder="E-Mail Inhalt hier eingeben…"
            />
          </section>

          {/* Image & CTA */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bild & Call-to-Action</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bild-URL (optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={!isEditable}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button-Text
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    disabled={!isEditable}
                    placeholder="z.B. Jetzt buchen"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button-URL
                  </label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    disabled={!isEditable}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Targeting */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              Empfänger
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zielgruppe
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'Alle Kunden' },
                    { value: 'specific', label: 'Bestimmte E-Mails' },
                    { value: 'segment', label: 'Segment' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTargetMode(opt.value)}
                      disabled={!isEditable}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                        targetMode === opt.value
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      } disabled:opacity-50`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {targetMode === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail-Adressen (eine pro Zeile)
                  </label>
                  <textarea
                    value={targetEmails}
                    onChange={(e) => setTargetEmails(e.target.value)}
                    disabled={!isEditable}
                    rows={4}
                    placeholder="max@example.com&#10;anna@example.com"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 font-mono"
                  />
                </div>
              )}

              {targetMode === 'segment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Segment
                  </label>
                  <select
                    value={targetSegment}
                    onChange={(e) => setTargetSegment(e.target.value)}
                    disabled={!isEditable}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">Segment wählen…</option>
                    {SEGMENTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Scheduling */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Planung (optional)
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Geplanter Versand
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={!isEditable}
                className="w-full sm:w-auto px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
              {scheduledAt && (
                <button
                  onClick={() => setScheduledAt('')}
                  className="ml-2 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Entfernen
                </button>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Leer lassen für sofortigen Versand per &quot;Kampagne senden&quot;
              </p>
            </div>
          </section>

          {/* Bottom actions (mobile) */}
          {isEditable && (
            <div className="flex flex-wrap gap-2 pb-8 sm:hidden">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Speichern
              </button>
              {campaignId && (
                <button
                  onClick={() => setShowSendConfirm(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                >
                  <Send className="w-4 h-4" />
                  Senden
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Test Email Dialog */}
      {showTestEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Test-E-Mail senden</h3>
            <p className="text-sm text-gray-500 mb-4">
              Die Kampagne wird gespeichert und eine Vorschau an die angegebene Adresse gesendet.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTestSend();
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowTestEmail(false);
                  setTestEmail('');
                }}
                disabled={sendingTest}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleTestSend}
                disabled={sendingTest || !testEmail.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {sendingTest && <Loader2 className="w-3 h-3 animate-spin" />}
                Senden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Confirmation Dialog */}
      {showSendConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-full">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Kampagne senden?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Die Kampagne wird an alle ausgewählten Empfänger versendet. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Zielgruppe: {targetMode === 'all' ? 'Alle Kunden' : targetMode === 'specific' ? 'Bestimmte E-Mails' : 'Segment'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSendConfirm(false)}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSendCampaign}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {sending && <Loader2 className="w-3 h-3 animate-spin" />}
                Jetzt senden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
