import { STORE_NAME } from '../config';

const DEFAULT_FILENAME = 'tryon-sri-mahalakshmi-silks.jpg';

export function downloadBlob(blob, filename = DEFAULT_FILENAME) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareImage(blob, { filename = DEFAULT_FILENAME, text } = {}) {
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
  const shareText = text || `Check out this virtual try-on from ${STORE_NAME}!`;

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Virtual Try-On',
        text: shareText,
      });
      return { method: 'web-share' };
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return { method: 'cancelled' };
      }
      // Fall through to download fallback
    }
  }

  downloadBlob(blob, filename);
  // Open WhatsApp web/app with prefilled text after the user has the image saved.
  try {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener');
  } catch {
    // Some embedded browsers block window.open — the download still succeeded.
  }
  return { method: 'download-fallback' };
}

export async function shareMultiple(blobs, { filenamePrefix = 'tryon' } = {}) {
  const files = blobs.map(
    (blob, i) =>
      new File([blob], `${filenamePrefix}-${String(i + 1).padStart(2, '0')}.jpg`, {
        type: blob.type || 'image/jpeg',
      })
  );

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files })) {
    try {
      await navigator.share({
        files,
        title: 'Virtual Try-Ons',
        text: `Try-ons from ${STORE_NAME}`,
      });
      return { method: 'web-share' };
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return { method: 'cancelled' };
      }
    }
  }

  // Fallback: download each individually with a small stagger.
  for (let i = 0; i < blobs.length; i += 1) {
    downloadBlob(blobs[i], files[i].name);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 250));
  }
  return { method: 'download-fallback' };
}
