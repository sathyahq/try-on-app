// Wraps @imgly/background-removal with progress reporting and graceful errors.
// The library runs entirely in-browser via WebAssembly + ONNX — no network calls
// after the first model download (which the service worker caches).

let removerPromise = null;

async function loadRemover() {
  if (!removerPromise) {
    removerPromise = import('@imgly/background-removal').then(
      (mod) => mod.default || mod.removeBackground || mod
    );
  }
  return removerPromise;
}

export async function removeBackground(imageBlob, onProgress) {
  const remover = await loadRemover();
  const fn = typeof remover === 'function' ? remover : remover.removeBackground;
  if (typeof fn !== 'function') {
    throw new Error('Background removal library failed to load');
  }

  const cleaned = await fn(imageBlob, {
    output: { format: 'image/png', quality: 0.9 },
    progress: (key, current, total) => {
      if (typeof onProgress === 'function') {
        onProgress({ key, current, total });
      }
    },
  });

  // The library returns the image at the original size with transparent
  // pixels where the background used to be. That leaves big transparent
  // margins around the actual garment, which makes auto-sizing wrong
  // (the bounding box is much larger than the visible garment).
  // Tight-crop to the alpha bounding box so downstream sizing is correct.
  try {
    return await tightCropAlpha(cleaned);
  } catch {
    return cleaned;
  }
}

async function tightCropAlpha(blob, alphaThreshold = 8) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    // Sample on a coarse grid first for speed, then refine.
    const step = Math.max(1, Math.round(Math.min(w, h) / 400));
    for (let y = 0; y < h; y += step) {
      const row = y * w * 4 + 3;
      for (let x = 0; x < w; x += step) {
        if (data[row + x * 4] > alphaThreshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return blob; // entirely transparent — bail out

    // Tiny padding so we don't clip antialiased edges
    const pad = Math.max(2, Math.round(Math.min(w, h) * 0.01));
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    if (cw === w && ch === h) return blob;

    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    out.getContext('2d').drawImage(img, minX, minY, cw, ch, 0, 0, cw, ch);

    return await new Promise((resolve) =>
      out.toBlob((b) => resolve(b || blob), 'image/png')
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Pre-warm the model at app start so the first try-on feels faster.
export async function preloadBackgroundRemovalModel() {
  try {
    await loadRemover();
  } catch {
    // Ignore — we'll surface real errors when the user actually tries to use it.
  }
}
