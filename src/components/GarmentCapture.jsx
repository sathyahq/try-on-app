import { useState } from 'react';
import CameraView from './CameraView';

// Captures the garment photo and hands it off raw — Gemini will read it
// directly, so no client-side background removal step is needed anymore.
export default function GarmentCapture({ garmentType, onReady, onCancel }) {
  const [preview, setPreview] = useState(null); // { blob, dataUrl }

  if (!preview) {
    return (
      <CameraView
        facing="environment"
        instruction="Lay the garment flat or hold it up against a plain background. Keep the whole garment in frame."
        onCapture={(blob, dataUrl) => setPreview({ blob, dataUrl })}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="screen animate-fade-in">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => setPreview(null)} className="btn-ghost !min-h-[40px] !px-3">←</button>
        <h2 className="text-lg font-bold text-maroon">Garment Photo</h2>
      </header>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="surface overflow-hidden w-full max-h-full">
          <img src={preview.dataUrl} alt="Garment" className="block w-full h-auto" />
        </div>
      </div>
      <div className="px-4 pb-6 pt-4 space-y-3">
        <button
          className="btn-primary"
          onClick={() => onReady({ blob: preview.blob, dataUrl: preview.dataUrl, garmentType })}
        >
          Create Try-On
        </button>
        <button className="btn-secondary" onClick={() => setPreview(null)}>
          Retake
        </button>
      </div>
    </div>
  );
}
