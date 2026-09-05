import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { storePendingTicketDraft } from '@/lib/pwa-drafts';

export function ShareTargetPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  React.useEffect(() => {
    const sharedTitle = params.get('title')?.trim();
    const sharedText = params.get('text')?.trim();
    const sharedUrl = params.get('url')?.trim();
    const description = [sharedText, sharedUrl].filter(Boolean).join('\n\n');

    storePendingTicketDraft({
      title: sharedTitle || 'Shared maintenance issue',
      description,
      source: 'share',
    });
    navigate('/tickets?new=1&source=share', { replace: true });
  }, [navigate, params]);

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 px-4 py-6 text-white sm:px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-400 text-slate-950">
          <Share2 className="h-5 w-5" />
        </div>
        <p className="mt-4 font-bold">Preparing your ticket…</p>
        <p className="mt-1 text-sm text-slate-400">Shared details will be placed in a new draft.</p>
      </div>
    </main>
  );
}
