'use client';

import { useCookieConsent } from '@/lib/cookie-consent';
import { Play, Cookie } from 'lucide-react';

interface ConsentYouTubeProps {
  videoId: string;
  title?: string;
  className?: string;
}

export default function ConsentYouTube({ videoId, title = 'YouTube Video', className = '' }: ConsentYouTubeProps) {
  const { hasConsent, acceptSelected, preferences } = useCookieConsent();

  if (hasConsent('external_media')) {
    return (
      <div className={`relative w-full aspect-video rounded-xl overflow-hidden ${className}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center ${className}`}>
      <img
        src={`https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover blur-lg opacity-30"
        loading="lazy"
      />
      <div className="relative z-10 text-center px-6">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play className="w-8 h-8 text-white" />
        </div>
        <p className="text-white font-bold text-sm mb-2">
          Externer Inhalt – YouTube
        </p>
        <p className="text-white/70 text-xs mb-4 max-w-sm mx-auto">
          Dieses Video wird von YouTube bereitgestellt. Beim Laden werden Daten an YouTube übertragen.
        </p>
        <button
          type="button"
          onClick={() => acceptSelected({ ...preferences, external_media: true })}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Cookie className="w-4 h-4" />
          Video laden &amp; Cookies akzeptieren
        </button>
      </div>
    </div>
  );
}
