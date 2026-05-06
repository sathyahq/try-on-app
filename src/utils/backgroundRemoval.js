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

  return fn(imageBlob, {
    output: { format: 'image/png', quality: 0.9 },
    progress: (key, current, total) => {
      if (typeof onProgress === 'function') {
        onProgress({ key, current, total });
      }
    },
  });
}

// Pre-warm the model at app start so the first try-on feels faster.
export async function preloadBackgroundRemovalModel() {
  try {
    await loadRemover();
  } catch {
    // Ignore — we'll surface real errors when the user actually tries to use it.
  }
}
