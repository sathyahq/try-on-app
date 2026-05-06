// Misc client-side image helpers shared by the try-on flow.

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // Strip the "data:image/jpeg;base64," prefix
      const idx = String(result).indexOf(',');
      resolve(idx >= 0 ? String(result).slice(idx + 1) : String(result));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64, mimeType = 'image/png') {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

// Downscale a blob so the longest edge is <= maxDim. Re-encodes as JPEG.
// Smaller payloads = faster API calls and stay under Vercel's 4.5MB limit.
export async function downsizeImage(blob, maxDim = 1024, quality = 0.92) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const longest = Math.max(w, h);
    if (longest > maxDim) {
      const r = maxDim / longest;
      w = Math.round(w * r);
      h = Math.round(h * r);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Image encode failed'))),
        'image/jpeg',
        quality
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
