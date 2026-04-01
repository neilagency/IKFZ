'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If a JS chunk failed to load (post-deployment stale cache), force reload.
    if (
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch dynamically imported module')
    ) {
      window.location.reload();
      return;
    }
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Etwas ist schiefgelaufen</h2>
      <p className="text-gray-600 mb-6">Bitte versuchen Sie es erneut.</p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-primary text-white rounded-xl font-medium"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
