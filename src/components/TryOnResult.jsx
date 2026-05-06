import { useEffect, useRef, useState } from 'react';
import { generateTryOn } from '../utils/geminiTryOn';
import { applyWatermark, canvasToBlob, loadImage } from '../utils/canvasCompositor';
import { shareImage, downloadBlob } from '../utils/shareUtils';
import { getGarmentType } from '../utils/garmentPositions';

// AI-powered try-on result screen.
// 3 phases: 'generating' → 'ready' → (or 'error')
export default function TryOnResult({
  customerPhoto,        // { blob, dataUrl, width, height }
  garmentBlob,          // raw garment photo blob
  garmentType,
  onSave,
  onTryAnother,
  onViewGallery,
  onNewCustomer,
  onBack,
  onRetake,
  tryOnCount,
}) {
  const [phase, setPhase] = useState('generating'); // 'generating' | 'ready' | 'error'
  const [progress, setProgress] = useState({ pct: 8, message: 'Preparing your photos…' });
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { blob, dataUrl }
  const [busy, setBusy] = useState(null);
  const cancelledRef = useRef(false);
  const savedRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setPhase('generating');
    setError(null);
    setResult(null);
    savedRef.current = false;

    (async () => {
      try {
        const aiBlob = await generateTryOn(
          { customerBlob: customerPhoto.blob, garmentBlob, garmentType },
          (p) => {
            if (!cancelledRef.current) setProgress(p);
          }
        );
        if (cancelledRef.current) return;

        // Apply store watermark on the AI output before showing it
        const aiUrl = URL.createObjectURL(aiBlob);
        const aiImg = await loadImage(aiUrl);
        const canvas = await applyWatermark(aiImg);
        const finalBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
        URL.revokeObjectURL(aiUrl);
        const finalUrl = URL.createObjectURL(finalBlob);

        if (cancelledRef.current) {
          URL.revokeObjectURL(finalUrl);
          return;
        }
        setResult({ blob: finalBlob, dataUrl: finalUrl });
        setPhase('ready');
      } catch (err) {
        if (cancelledRef.current) return;
        console.error('Try-on generation failed', err);
        setError(err.message || 'Try-on generation failed.');
        setPhase('error');
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [customerPhoto.blob, garmentBlob, garmentType]);

  function buildEntry() {
    return {
      id: `tryon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      garmentType,
      blob: result.blob,
      dataUrl: result.dataUrl,
      createdAt: Date.now(),
    };
  }

  function commit() {
    if (!result || savedRef.current) return;
    savedRef.current = true;
    onSave?.(buildEntry());
  }

  async function handleShare() {
    if (busy || !result) return;
    setBusy('sharing');
    try {
      await shareImage(result.blob, {
        filename: `tryon-${garmentType}-${Date.now()}.jpg`,
      });
      commit();
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    if (busy || !result) return;
    setBusy('downloading');
    try {
      downloadBlob(result.blob, `tryon-${garmentType}-${Date.now()}.jpg`);
      commit();
    } finally {
      setBusy(null);
    }
  }

  function handleTryAnother() {
    commit();
    onTryAnother();
  }
  function handleViewGallery() {
    commit();
    onViewGallery();
  }
  function handleNewCustomer() {
    commit();
    onNewCustomer();
  }

  const garmentLabel = getGarmentType(garmentType).label;

  if (phase === 'generating') {
    return (
      <div className="screen items-center justify-center px-6 py-8 animate-fade-in">
        <div className="text-center max-w-sm">
          <div className="text-gold text-xs tracking-[0.2em] uppercase mb-2">
            {garmentLabel}
          </div>
          <h3 className="text-xl font-bold text-maroon mb-3">Creating your try-on…</h3>
          <p className="text-sm text-ink/60 mb-8">{progress.message}</p>

          <div className="w-full h-2 bg-maroon/10 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-maroon to-gold transition-[width] duration-500"
              style={{ width: `${progress.pct || 8}%` }}
            />
          </div>
          <div className="text-xs text-ink/50">{progress.pct || 8}%</div>

          <p className="text-xs text-ink/40 mt-8">
            This usually takes 5 to 15 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    const isQuota = /quota|429/i.test(error || '');
    return (
      <div className="screen items-center justify-center px-6 py-8 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-maroon/10 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#800020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-maroon mb-2">
          {isQuota ? 'Daily AI quota reached' : 'Try-on generation failed'}
        </h3>
        <p className="text-sm text-ink/70 mb-8 max-w-sm">{error}</p>
        <div className="w-full max-w-xs space-y-3">
          <button className="btn-primary" onClick={onRetake}>
            Try a Different Photo
          </button>
          <button className="btn-ghost w-full" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // ready
  return (
    <div className="screen animate-fade-in">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost !min-h-[40px] !px-3">←</button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-maroon leading-tight">
            {garmentLabel}
          </h2>
          <p className="text-xs text-ink/60">Looks good?</p>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-2 min-h-0">
        <div className="surface overflow-hidden max-h-full">
          <img
            src={result.dataUrl}
            alt="Try-on result"
            className="block max-w-full max-h-[68vh] object-contain"
          />
        </div>
      </div>

      <div className="px-4 pb-5 pt-3 grid grid-cols-2 gap-2">
        <button className="btn-primary col-span-2" onClick={handleShare} disabled={!!busy}>
          <WhatsAppIcon />
          {busy === 'sharing' ? 'Sharing…' : 'Share on WhatsApp'}
        </button>
        <button className="btn-secondary" onClick={handleDownload} disabled={!!busy}>
          {busy === 'downloading' ? 'Saving…' : 'Download'}
        </button>
        <button className="btn-secondary" onClick={handleTryAnother} disabled={!!busy}>
          Try Another
        </button>
        <button className="btn-ghost col-span-1" onClick={handleViewGallery} disabled={!!busy}>
          View Try-Ons {tryOnCount > 0 ? `(${tryOnCount + 1})` : ''}
        </button>
        <button className="btn-ghost col-span-1" onClick={handleNewCustomer} disabled={!!busy}>
          New Customer
        </button>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.52 3.48A11.94 11.94 0 0 0 12.04 0C5.5 0 .19 5.31.19 11.85c0 2.09.55 4.13 1.59 5.93L0 24l6.39-1.67a11.84 11.84 0 0 0 5.65 1.44h.01c6.55 0 11.86-5.31 11.86-11.85 0-3.17-1.23-6.15-3.39-8.44zM12.04 21.79h-.01a9.93 9.93 0 0 1-5.06-1.39l-.36-.21-3.79.99 1.01-3.69-.24-.38a9.85 9.85 0 0 1-1.51-5.26c0-5.45 4.43-9.88 9.88-9.88 2.64 0 5.12 1.03 6.99 2.9a9.81 9.81 0 0 1 2.89 6.99c0 5.45-4.43 9.93-9.8 9.93zm5.66-7.42c-.31-.16-1.84-.91-2.13-1.01-.29-.11-.5-.16-.71.16-.21.31-.81 1.01-.99 1.22-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.13-.63.14-.14.31-.36.46-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54l-.6-.01c-.21 0-.55.08-.84.39-.29.31-1.1 1.07-1.1 2.62 0 1.55 1.13 3.04 1.29 3.25.16.21 2.23 3.4 5.41 4.77.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.84-.75 2.1-1.48.26-.73.26-1.35.18-1.48-.08-.13-.29-.21-.6-.36z" />
    </svg>
  );
}
