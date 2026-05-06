import { useEffect, useRef, useState } from 'react';
import { getGarmentType } from '../utils/garmentPositions';
import { shareImage, shareMultiple } from '../utils/shareUtils';

export default function SessionGallery({ tryOns, onClose }) {
  const [index, setIndex] = useState(Math.max(0, tryOns.length - 1));
  const swipeRef = useRef(null);

  useEffect(() => {
    if (index >= tryOns.length) setIndex(Math.max(0, tryOns.length - 1));
  }, [tryOns.length, index]);

  const current = tryOns[index];

  // Touch swipe to navigate
  function onTouchStart(e) {
    swipeRef.current = { x: e.touches[0].clientX, time: Date.now() };
  }
  function onTouchEnd(e) {
    if (!swipeRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeRef.current.x;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && index < tryOns.length - 1) setIndex(index + 1);
      if (dx > 0 && index > 0) setIndex(index - 1);
    }
    swipeRef.current = null;
  }

  async function shareCurrent() {
    if (!current) return;
    await shareImage(current.blob, {
      filename: `tryon-${current.garmentType}-${current.id}.jpg`,
    });
  }

  async function shareAll() {
    if (tryOns.length === 0) return;
    await shareMultiple(tryOns.map((t) => t.blob), {
      filenamePrefix: 'sri-mahalakshmi-tryon',
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-cream flex flex-col animate-fade-in">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onClose} className="btn-ghost !min-h-[40px] !px-3">← Back</button>
        <div className="flex-1 text-center">
          <h2 className="text-lg font-bold text-maroon">Session Try-Ons</h2>
          <p className="text-xs text-ink/60">
            {tryOns.length === 0 ? 'No try-ons yet' : `${index + 1} of ${tryOns.length}`}
          </p>
        </div>
        <span className="w-10" />
      </header>

      <div
        className="flex-1 flex items-center justify-center px-4 py-2 min-h-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {current ? (
          <div className="surface overflow-hidden max-h-full">
            <img
              key={current.id}
              src={current.dataUrl}
              alt={`Try-on ${index + 1}`}
              className="block max-w-full max-h-[60vh] object-contain animate-fade-in"
            />
            <div className="px-4 py-2 text-xs text-ink/70 text-center">
              {getGarmentType(current.garmentType).label}
            </div>
          </div>
        ) : (
          <div className="text-ink/50">Take a try-on first to see it here.</div>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="px-3 pt-2 pb-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {tryOns.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setIndex(i)}
              className={`flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                i === index ? 'border-maroon shadow-soft' : 'border-transparent opacity-70'
              }`}
              aria-label={`View try-on ${i + 1}`}
            >
              <img
                src={t.dataUrl}
                alt=""
                className="w-20 h-24 object-cover"
              />
              <div className="text-[10px] py-1 px-1 bg-white/80 text-ink/70 text-center">
                {getGarmentType(t.garmentType).label.split(' ')[0]}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 grid grid-cols-2 gap-2">
        <button className="btn-primary" onClick={shareCurrent} disabled={!current}>
          Share This
        </button>
        <button className="btn-secondary" onClick={shareAll} disabled={tryOns.length === 0}>
          Share All ({tryOns.length})
        </button>
      </div>
    </div>
  );
}
