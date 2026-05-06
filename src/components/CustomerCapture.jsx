import { useState } from 'react';
import CameraView from './CameraView';

export default function CustomerCapture({ onConfirm, onCancel }) {
  const [preview, setPreview] = useState(null); // { blob, dataUrl, width, height }

  if (!preview) {
    return (
      <CameraView
        facing="user"
        showSilhouette
        instruction="Position the customer inside the silhouette. Stand straight, arms slightly away from body."
        onCapture={(blob, dataUrl, dims) =>
          setPreview({ blob, dataUrl, width: dims.width, height: dims.height })
        }
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="screen animate-fade-in">
      <div className="px-4 pt-4 flex items-center justify-between">
        <button onClick={onCancel} className="btn-ghost">← Back</button>
        <h2 className="text-lg font-semibold text-maroon">Confirm Photo</h2>
        <span className="w-10" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-4">
        <div className="surface overflow-hidden w-full max-h-full">
          <img
            src={preview.dataUrl}
            alt="Captured customer"
            className="block w-full h-auto"
          />
        </div>
      </div>

      <div className="px-4 pb-6 space-y-3">
        <button
          className="btn-primary"
          onClick={() =>
            onConfirm({
              blob: preview.blob,
              dataUrl: preview.dataUrl,
              width: preview.width,
              height: preview.height,
            })
          }
        >
          Use This Photo
        </button>
        <button className="btn-secondary" onClick={() => setPreview(null)}>
          Retake
        </button>
      </div>
    </div>
  );
}
