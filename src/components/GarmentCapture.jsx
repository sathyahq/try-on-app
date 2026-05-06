import { useState } from 'react';
import CameraView from './CameraView';
import { removeBackground } from '../utils/backgroundRemoval';

// Three internal phases: 'camera' → 'processing' → 'preview' (or 'error')
export default function GarmentCapture({ garmentType, onReady, onCancel }) {
  const [phase, setPhase] = useState('camera');
  const [progress, setProgress] = useState({ current: 0, total: 1, key: '' });
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { dataUrl, blob }
  const [sourceDataUrl, setSourceDataUrl] = useState(null);

  async function handleCaptured(blob, dataUrl) {
    setSourceDataUrl(dataUrl);
    setPhase('processing');
    setProgress({ current: 0, total: 1, key: 'starting' });
    setError(null);

    try {
      const cleaned = await removeBackground(blob, ({ key, current, total }) => {
        setProgress({ key, current: current || 0, total: total || 1 });
      });
      const cleanedUrl = URL.createObjectURL(cleaned);
      setResult({ blob: cleaned, dataUrl: cleanedUrl });
      setPhase('preview');
    } catch (err) {
      console.error('Background removal failed', err);
      setError(
        "The background couldn't be removed cleanly. Try photographing the garment against a lighter or plain background."
      );
      setPhase('error');
    }
  }

  function handleRetake() {
    if (result?.dataUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(result.dataUrl);
    }
    setResult(null);
    setError(null);
    setSourceDataUrl(null);
    setPhase('camera');
  }

  if (phase === 'camera') {
    return (
      <CameraView
        facing="environment"
        instruction="Lay the garment flat or hold it up against a plain background."
        onCapture={handleCaptured}
        onCancel={onCancel}
      />
    );
  }

  if (phase === 'processing') {
    const pct =
      progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;
    return (
      <div className="screen items-center justify-center px-6 py-8 animate-fade-in">
        {sourceDataUrl && (
          <img
            src={sourceDataUrl}
            alt="Captured garment"
            className="w-full max-w-xs rounded-2xl mb-6 opacity-80"
          />
        )}
        <h3 className="text-lg font-semibold text-maroon">Removing background…</h3>
        <p className="text-sm text-ink/60 mt-1 text-center max-w-xs">
          Processing on this device. The first time may take a few extra seconds while the model loads.
        </p>
        <div className="w-full max-w-xs mt-6 h-2 bg-maroon/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-maroon to-gold transition-[width] duration-300"
            style={{ width: `${pct || 8}%` }}
          />
        </div>
        <div className="text-xs text-ink/50 mt-2">{progress.key || 'Loading…'} {pct ? `· ${pct}%` : ''}</div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="screen items-center justify-center px-6 py-8 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-maroon/10 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#800020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-maroon mb-2">Background removal failed</h3>
        <p className="text-sm text-ink/70 mb-8 max-w-sm">{error}</p>
        <div className="w-full max-w-xs space-y-3">
          <button className="btn-primary" onClick={handleRetake}>Retry</button>
          <button className="btn-ghost w-full" onClick={onCancel}>Back</button>
        </div>
      </div>
    );
  }

  // preview
  return (
    <div className="screen animate-fade-in">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={handleRetake} className="btn-ghost !min-h-[40px] !px-3">←</button>
        <h2 className="text-lg font-bold text-maroon">Garment Preview</h2>
      </header>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-h-full rounded-3xl overflow-hidden checkerboard shadow-soft">
          <img src={result.dataUrl} alt="Isolated garment" className="block w-full h-auto" />
        </div>
      </div>
      <div className="px-4 pb-6 pt-4 space-y-3">
        <button
          className="btn-primary"
          onClick={() => onReady({ blob: result.blob, dataUrl: result.dataUrl, garmentType })}
        >
          Create Try-On
        </button>
        <button className="btn-secondary" onClick={handleRetake}>
          Retake
        </button>
      </div>
    </div>
  );
}
