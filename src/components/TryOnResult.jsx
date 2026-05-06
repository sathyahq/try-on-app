import { useEffect, useMemo, useRef, useState } from 'react';
import OverlayEditor from './OverlayEditor';
import { loadImage, canvasToBlob } from '../utils/canvasCompositor';
import { presetToTransform, getGarmentType } from '../utils/garmentPositions';
import { shareImage, downloadBlob } from '../utils/shareUtils';

export default function TryOnResult({
  customerPhoto, // { dataUrl, width, height }
  garmentDataUrl,
  garmentType,
  onSave,        // (entry) => void   - called when staff moves on or shares
  onTryAnother,
  onViewGallery,
  onNewCustomer,
  onBack,
  tryOnCount,
}) {
  const editorRef = useRef(null);
  const [customerImage, setCustomerImage] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);
  const [opacity, setOpacity] = useState(0.85);
  const [transform, setTransform] = useState(null);
  const [busy, setBusy] = useState(null); // 'sharing' | 'downloading' | null

  // Load both images
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ci, gi] = await Promise.all([
        loadImage(customerPhoto.dataUrl),
        loadImage(garmentDataUrl),
      ]);
      if (cancelled) return;
      setCustomerImage(ci);
      setGarmentImage(gi);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerPhoto.dataUrl, garmentDataUrl]);

  // Compute initial transform once both images are ready
  const initialTransform = useMemo(() => {
    if (!customerImage || !garmentImage) return null;
    const photoSize = {
      w: customerImage.naturalWidth,
      h: customerImage.naturalHeight,
    };
    const garmentNatural = {
      w: garmentImage.naturalWidth,
      h: garmentImage.naturalHeight,
    };
    const t = presetToTransform(
      getGarmentType(garmentType).preset,
      photoSize,
      garmentNatural
    );
    return t;
  }, [customerImage, garmentImage, garmentType]);

  useEffect(() => {
    if (initialTransform) setTransform(initialTransform);
  }, [initialTransform]);

  async function exportBlob() {
    const canvas = editorRef.current?.getCanvas();
    if (!canvas) return null;
    return canvasToBlob(canvas, 'image/jpeg', 0.92);
  }

  function buildEntry(blob, dataUrl) {
    return {
      id: `tryon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      garmentType,
      blob,
      dataUrl,
      transform: editorRef.current?.getTransform() || transform,
      opacity,
      garmentDataUrl,
      createdAt: Date.now(),
    };
  }

  async function commitToSession() {
    const blob = await exportBlob();
    if (!blob) return null;
    const dataUrl = URL.createObjectURL(blob);
    const entry = buildEntry(blob, dataUrl);
    onSave?.(entry);
    return entry;
  }

  async function handleShare() {
    if (busy) return;
    setBusy('sharing');
    try {
      const blob = await exportBlob();
      if (!blob) return;
      await shareImage(blob, {
        filename: `tryon-${garmentType}-${Date.now()}.jpg`,
      });
      // Auto-save to session so staff doesn't have to remember.
      const dataUrl = URL.createObjectURL(blob);
      onSave?.(buildEntry(blob, dataUrl));
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    if (busy) return;
    setBusy('downloading');
    try {
      const blob = await exportBlob();
      if (!blob) return;
      downloadBlob(blob, `tryon-${garmentType}-${Date.now()}.jpg`);
      const dataUrl = URL.createObjectURL(blob);
      onSave?.(buildEntry(blob, dataUrl));
    } finally {
      setBusy(null);
    }
  }

  async function handleTryAnother() {
    await commitToSession();
    onTryAnother();
  }

  async function handleViewGallery() {
    await commitToSession();
    onViewGallery();
  }

  async function handleNewCustomer() {
    await commitToSession();
    onNewCustomer();
  }

  return (
    <div className="screen animate-fade-in">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost !min-h-[40px] !px-3">←</button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-maroon leading-tight">
            {getGarmentType(garmentType).label}
          </h2>
          <p className="text-xs text-ink/60">Drag to reposition · Pinch to resize · Twist handle to rotate</p>
        </div>
      </header>

      <div className="flex-1 px-3 py-2 flex flex-col items-center justify-center min-h-0">
        {customerImage && garmentImage && initialTransform ? (
          <OverlayEditor
            ref={editorRef}
            customerImage={customerImage}
            garmentImage={garmentImage}
            initialTransform={initialTransform}
            opacity={opacity}
            onTransformChange={setTransform}
          />
        ) : (
          <div className="text-ink/60 animate-pulse-soft">Preparing try-on…</div>
        )}
      </div>

      {/* Opacity slider */}
      <div className="px-6 pb-2 pt-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink/60 w-14">Opacity</span>
          <input
            type="range"
            min="30"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="flex-1 accent-maroon h-2"
          />
          <span className="text-xs text-ink/70 w-10 text-right">
            {Math.round(opacity * 100)}%
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-5 pt-2 grid grid-cols-2 gap-2">
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
