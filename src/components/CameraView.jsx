import { useEffect, useRef, useState } from 'react';

// Reusable camera view. Renders the live <video> stream and exposes Capture +
// Switch-camera + Cancel controls. Optional silhouette overlay used on the
// customer-capture screen.
//
// Props:
//   facing: 'user' | 'environment'  - initial camera facing
//   showSilhouette: boolean         - draw body silhouette guide overlay
//   instruction: string             - small caption shown above the shutter
//   onCapture(blob, dataUrl)        - called when staff hits the shutter
//   onCancel()                      - back button handler
export default function CameraView({
  facing = 'user',
  showSilhouette = false,
  instruction,
  onCapture,
  onCancel,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [currentFacing, setCurrentFacing] = useState(facing);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      stopStream();
      setReady(false);
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError({
          title: 'Camera unavailable',
          body: 'This device or browser does not expose a camera. Try opening this app in Chrome on the store device.',
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: currentFacing },
            width: { ideal: 1920 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (err) {
        if (cancelled) return;
        const denied = err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
        setError(
          denied
            ? {
                title: 'Camera permission needed',
                body: 'Please enable camera access for this app in your device settings, then try again.',
                denied: true,
              }
            : {
                title: 'Camera unavailable',
                body: 'We could not open the camera. Make sure no other app is using it and try again.',
              }
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFacing]);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function handleCapture() {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const video = videoRef.current;
      const w = video.videoWidth;
      const h = video.videoHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Front-facing cameras feel more natural mirrored back to the customer.
      if (currentFacing === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92)
      );
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onCapture?.(blob, dataUrl, { width: w, height: h });
    } finally {
      setBusy(false);
    }
  }

  function handleSwitch() {
    setCurrentFacing((f) => (f === 'user' ? 'environment' : 'user'));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col no-touch-action">
      <div className="absolute inset-0">
        {error ? (
          <ErrorOverlay error={error} onRetry={() => setCurrentFacing((f) => f)} onCancel={onCancel} />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${currentFacing === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            {showSilhouette && <SilhouetteGuide />}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-white/80 animate-pulse-soft">Opening camera…</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Top bar — respects the device notch / status bar */}
      <div
        className="relative z-10 flex items-center justify-between px-4"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <button onClick={onCancel} className="btn-pill !bg-black/40 !text-white" aria-label="Back">
          ← Back
        </button>
        <button
          onClick={handleSwitch}
          className="btn-pill !bg-black/40 !text-white"
          aria-label="Switch camera"
          disabled={!!error}
        >
          <SwitchIcon /> Flip
        </button>
      </div>

      <div className="flex-1" />

      {/* Bottom bar — anchored to the bottom with safe-area padding so the
          capture button always sits where users expect it on phones with
          home indicators or browser bottom bars */}
      <div
        className="relative z-10 pt-6 px-6 bg-gradient-to-t from-black/70 to-transparent"
        style={{
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {instruction && (
          <p className="text-center text-sm text-white/90 mb-4 max-w-xs mx-auto">
            {instruction}
          </p>
        )}
        <div className="flex items-center justify-center">
          <button
            onClick={handleCapture}
            disabled={!ready || busy || !!error}
            className="w-20 h-20 rounded-full bg-white shadow-lift active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center"
            aria-label="Capture"
          >
            <span className="block w-16 h-16 rounded-full border-4 border-maroon" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SilhouetteGuide() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <svg
        viewBox="0 0 200 320"
        className="h-[80%] opacity-30"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="6 6"
      >
        {/* Head */}
        <circle cx="100" cy="40" r="22" />
        {/* Neck */}
        <path d="M88 60 L88 78 Q100 84 112 78 L112 60" />
        {/* Shoulders + torso */}
        <path d="M40 100 Q70 84 88 78 L112 78 Q130 84 160 100 L150 200 Q140 220 130 260 L70 260 Q60 220 50 200 Z" />
        {/* Arms (slightly out from body) */}
        <path d="M40 100 Q22 150 24 220" />
        <path d="M160 100 Q178 150 176 220" />
      </svg>
    </div>
  );
}

function SwitchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 13.7 4.7L20 16" />
      <path d="M20 20v-4h-4" />
    </svg>
  );
}

function ErrorOverlay({ error, onRetry, onCancel }) {
  return (
    <div className="absolute inset-0 bg-cream text-ink flex flex-col items-center justify-center px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-maroon/10 flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#800020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-maroon mb-2">{error.title}</h3>
      <p className="text-sm text-ink/70 mb-8 max-w-sm">{error.body}</p>
      <div className="w-full max-w-xs space-y-3">
        <button className="btn-primary" onClick={onRetry}>
          Try Again
        </button>
        <button className="btn-ghost w-full" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
