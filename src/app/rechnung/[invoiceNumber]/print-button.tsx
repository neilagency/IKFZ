'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export default function PrintButton({ invoiceNumber, token }: { invoiceNumber: string; token?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    try {
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
      const res = await fetch(`/api/invoice/${encodeURIComponent(invoiceNumber)}/pdf/${tokenParam}`);
      if (!res.ok) throw new Error('PDF konnte nicht heruntergeladen werden.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rechnung-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('PDF konnte nicht heruntergeladen werden. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-700 text-white font-bold px-6 py-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Wird erstellt...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Rechnung drucken
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
